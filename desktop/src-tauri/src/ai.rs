use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::BTreeMap,
    time::{Instant, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter};

use crate::{settings, storage};

pub const AI_STREAM_EVENT_NAME: &str = "desktop://ai-stream";
const DEFAULT_EXA_BASE_URL: &str = "https://api.exa.ai";
const MAX_FETCHED_WEBPAGE_CHARS: usize = 8_000;
const MAX_FETCHED_WEBPAGE_COUNT: usize = 3;
const MAX_SEARCH_RESULTS: usize = 5;
const MAX_SEARCH_SNIPPET_CHARS: usize = 2_000;
const MAX_TOOL_ROUNDS: usize = 6;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartAiPromptStreamInput {
    pub provider: String,
    pub prompt: String,
    pub document_id: Option<String>,
    pub model: Option<String>,
    pub base_url: Option<String>,
    pub request_id: Option<String>,
    pub system_prompt: Option<String>,
    #[serde(default)]
    pub images: Vec<String>,
    #[serde(default)]
    pub conversation: Vec<DesktopAiConversationMessage>,
    #[serde(default)]
    pub thinking_enabled: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum InterviewTurnKind {
    Start,
    Answer,
    Hint,
    Skip,
    EndRound,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartInterviewTurnStreamInput {
    pub session_id: String,
    pub round_id: Option<String>,
    pub kind: InterviewTurnKind,
    pub message: Option<String>,
    pub metadata: Option<Value>,
    pub provider: Option<String>,
    pub model: Option<String>,
    pub base_url: Option<String>,
    pub request_id: Option<String>,
    pub locale: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateInterviewReportInput {
    pub session_id: String,
    pub provider: Option<String>,
    pub model: Option<String>,
    pub base_url: Option<String>,
    pub locale: Option<String>,
    #[serde(default)]
    pub force_regenerate: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DesktopAiConversationRole {
    User,
    Assistant,
}

impl DesktopAiConversationRole {
    fn as_str(&self) -> &'static str {
        match self {
            Self::User => "user",
            Self::Assistant => "assistant",
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopAiConversationMessage {
    pub role: DesktopAiConversationRole,
    pub content: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiStreamStartReceipt {
    pub request_id: String,
    pub provider: String,
    pub model: String,
    pub event_name: String,
    pub started_at_epoch_ms: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum DesktopAiStreamEventKind {
    Started,
    Delta,
    DeltaThinking,
    Completed,
    Error,
    Tool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum DesktopAiToolCallState {
    InputStreaming,
    OutputAvailable,
    OutputError,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopAiToolCallPayload {
    pub tool_call_id: String,
    pub tool_name: String,
    pub state: DesktopAiToolCallState,
    pub input: Option<serde_json::Value>,
    pub output: Option<serde_json::Value>,
    pub error_text: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopAiStreamEvent {
    pub request_id: String,
    pub provider: String,
    pub model: String,
    pub kind: DesktopAiStreamEventKind,
    pub started_at_epoch_ms: u64,
    pub emitted_at_epoch_ms: u64,
    pub finished_at_epoch_ms: Option<u64>,
    pub chunk_index: Option<u32>,
    pub delta_text: Option<String>,
    pub accumulated_text: Option<String>,
    pub accumulated_thinking: Option<String>,
    pub error_message: Option<String>,
    pub tool_call: Option<DesktopAiToolCallPayload>,
}

#[derive(Debug, Clone)]
struct ResolvedProviderConfig {
    provider: String,
    base_url: String,
    model: String,
    api_key: String,
}

#[derive(Debug, Clone)]
struct ResolvedExaConfig {
    base_url: String,
    api_key: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InterviewReportModelOutput {
    overall_score: i32,
    summary: String,
    overall_feedback: String,
    #[serde(default)]
    improvement_suggestions: Vec<String>,
    #[serde(default)]
    weak_points: Vec<InterviewWeakPointModelOutput>,
    #[serde(default)]
    training_plan: Vec<InterviewTrainingPlanItemModelOutput>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct InterviewWeakPointModelOutput {
    title: String,
    evidence: String,
    severity: String,
    training_focus: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct InterviewTrainingPlanItemModelOutput {
    title: String,
    description: String,
    priority: String,
    #[serde(default)]
    drills: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct InterviewAnswerEvaluationModelOutput {
    overall_score: i32,
    summary: String,
    #[serde(default)]
    dimensions: Vec<InterviewAnswerEvaluationDimensionOutput>,
    #[serde(default)]
    strengths: Vec<String>,
    #[serde(default)]
    risk_points: Vec<String>,
    follow_up_question: Option<String>,
    #[serde(default)]
    training_suggestions: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct InterviewAnswerEvaluationDimensionOutput {
    id: String,
    label: String,
    score: i32,
    feedback: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateSectionToolInput {
    section_id: String,
    title: Option<String>,
    content: serde_json::Value,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReplaceResumeTextToolInput {
    patches: Vec<ResumeTextReplacementInput>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ResumeTextReplacementInput {
    section_id: String,
    original_text: String,
    replacement_text: String,
    reason: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateResumeMetadataToolInput {
    title: Option<String>,
    template: Option<String>,
    language: Option<String>,
    target_job_title: Option<String>,
    target_company: Option<String>,
}

#[derive(Debug, Clone)]
struct OpenAiToolCallDelta {
    index: usize,
    id: Option<String>,
    name: Option<String>,
    arguments_fragment: Option<String>,
}

#[derive(Debug, Clone, Default)]
struct StreamingToolCall {
    id: Option<String>,
    name: Option<String>,
    arguments: String,
}

#[derive(Debug, Clone)]
struct CompletedToolCall {
    id: String,
    name: String,
    arguments: serde_json::Value,
}

struct OpenAiRoundOutcome {
    assistant_text: String,
    tool_calls: Vec<CompletedToolCall>,
}

struct ExaToolRunOutcome {
    prompt_context: Option<String>,
    tool_output: serde_json::Value,
}

#[derive(Default)]
struct SseEventBuffer {
    buffer: Vec<u8>,
}

impl SseEventBuffer {
    fn push(&mut self, chunk: &[u8]) -> Vec<String> {
        self.buffer.extend_from_slice(chunk);
        let mut events = Vec::new();

        while let Some(boundary_index) = find_sse_boundary(&self.buffer) {
            let event_bytes = self.buffer.drain(..boundary_index).collect::<Vec<u8>>();
            let payload_bytes = trim_event_terminator(event_bytes);

            if payload_bytes.is_empty() {
                continue;
            }

            if let Ok(payload) = String::from_utf8(payload_bytes) {
                events.push(payload);
            }
        }

        events
    }
}

pub fn start_ai_prompt_stream(
    app: &AppHandle,
    workspace_root: &std::path::Path,
    input: StartAiPromptStreamInput,
) -> Result<AiStreamStartReceipt, String> {
    let prompt = input.prompt.trim().to_string();
    if prompt.is_empty() {
        return Err("prompt is required for native streaming".into());
    }

    let resolved = resolve_provider_config(workspace_root, &input)?;
    let request_id = input
        .request_id
        .clone()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let started_at_epoch_ms = now_epoch_ms()?;
    let app_handle = app.clone();
    let workspace_root = workspace_root.to_path_buf();
    let system_prompt = input
        .system_prompt
        .as_ref()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    let images = input
        .images
        .iter()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>();
    let document_id = input
        .document_id
        .as_ref()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    let conversation = input
        .conversation
        .iter()
        .filter_map(|message| {
            let content = message.content.trim();
            if content.is_empty() {
                return None;
            }

            Some(DesktopAiConversationMessage {
                role: message.role.clone(),
                content: content.to_string(),
            })
        })
        .collect::<Vec<_>>();
    let receipt = AiStreamStartReceipt {
        request_id: request_id.clone(),
        provider: resolved.provider.clone(),
        model: resolved.model.clone(),
        event_name: AI_STREAM_EVENT_NAME.into(),
        started_at_epoch_ms,
    };

    let thinking_enabled = input.thinking_enabled;

    tauri::async_runtime::spawn(async move {
        let run_result = match resolved.provider.as_str() {
            "openai" => {
                run_openai_compatible_stream(
                    &app_handle,
                    &workspace_root,
                    &request_id,
                    &prompt,
                    system_prompt.as_deref(),
                    document_id.as_deref(),
                    &conversation,
                    &images,
                    &resolved,
                    started_at_epoch_ms,
                    thinking_enabled,
                )
                .await
            }
            "anthropic" => {
                run_anthropic_stream(
                    &app_handle,
                    &workspace_root,
                    &request_id,
                    &prompt,
                    system_prompt.as_deref(),
                    document_id.as_deref(),
                    &conversation,
                    &images,
                    &resolved,
                    started_at_epoch_ms,
                    thinking_enabled,
                )
                .await
            }
            unsupported => Err(format!(
                "provider '{unsupported}' is not wired for native desktop streaming yet."
            )),
        };

        if let Err(error) = run_result {
            let _ = emit_stream_event(
                &app_handle,
                DesktopAiStreamEvent {
                    request_id: request_id.clone(),
                    provider: resolved.provider.clone(),
                    model: resolved.model.clone(),
                    kind: DesktopAiStreamEventKind::Error,
                    started_at_epoch_ms,
                    emitted_at_epoch_ms: now_epoch_ms().unwrap_or(started_at_epoch_ms),
                    finished_at_epoch_ms: Some(now_epoch_ms().unwrap_or(started_at_epoch_ms)),
                    chunk_index: None,
                    delta_text: None,
                    accumulated_text: None,
                    accumulated_thinking: None,
                    error_message: Some(error),
                    tool_call: None,
                },
            );
        }
    });

    Ok(receipt)
}

pub fn start_interview_turn_stream(
    app: &AppHandle,
    workspace_root: &std::path::Path,
    input: StartInterviewTurnStreamInput,
) -> Result<AiStreamStartReceipt, String> {
    let session_id = input.session_id.trim().to_string();
    if session_id.is_empty() {
        return Err("sessionId is required for interview streaming".into());
    }

    let resolved = resolve_provider_config_from_parts(
        workspace_root,
        input.provider.as_deref(),
        input.model.as_deref(),
        input.base_url.as_deref(),
    )?;
    let request_id = input
        .request_id
        .clone()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let started_at_epoch_ms = now_epoch_ms()?;
    let receipt = AiStreamStartReceipt {
        request_id: request_id.clone(),
        provider: resolved.provider.clone(),
        model: resolved.model.clone(),
        event_name: AI_STREAM_EVENT_NAME.into(),
        started_at_epoch_ms,
    };

    let app_handle = app.clone();
    let workspace_root = workspace_root.to_path_buf();
    let locale = normalize_interview_locale(input.locale.as_deref());

    tauri::async_runtime::spawn(async move {
        let run_result = match resolved.provider.as_str() {
            "openai" | "anthropic" => {
                run_interview_turn_stream(
                    &app_handle,
                    &workspace_root,
                    resolved.clone(),
                    request_id.clone(),
                    started_at_epoch_ms,
                    session_id,
                    input.round_id,
                    input.kind,
                    input.message,
                    input.metadata,
                    locale,
                )
                .await
            }
            unsupported => Err(format!(
                "provider '{unsupported}' is not wired for native interview streaming yet."
            )),
        };

        if let Err(error) = run_result {
            let _ = emit_stream_event(
                &app_handle,
                DesktopAiStreamEvent {
                    request_id: request_id.clone(),
                    provider: resolved.provider.clone(),
                    model: resolved.model.clone(),
                    kind: DesktopAiStreamEventKind::Error,
                    started_at_epoch_ms,
                    emitted_at_epoch_ms: now_epoch_ms().unwrap_or(started_at_epoch_ms),
                    finished_at_epoch_ms: Some(now_epoch_ms().unwrap_or(started_at_epoch_ms)),
                    chunk_index: None,
                    delta_text: None,
                    accumulated_text: None,
                    accumulated_thinking: None,
                    error_message: Some(error),
                    tool_call: None,
                },
            );
        }
    });

    Ok(receipt)
}

pub async fn generate_interview_report(
    app: &AppHandle,
    workspace_root: &std::path::Path,
    input: GenerateInterviewReportInput,
) -> Result<storage::InterviewReportRecord, String> {
    let session_id = input.session_id.trim().to_string();
    if session_id.is_empty() {
        return Err("sessionId is required for interview report generation".into());
    }

    let session = storage::get_interview_session(app, &session_id)?
        .ok_or_else(|| format!("interview session not found: {session_id}"))?;
    if let Some(report) = session.report.clone() {
        if !input.force_regenerate {
            return Ok(report);
        }
    }

    let transcript_exists = session.rounds.iter().any(|round| {
        round.messages.iter().any(|message| {
            matches!(message.role.as_str(), "candidate" | "interviewer")
                && !message.content.trim().is_empty()
        })
    });
    if !transcript_exists {
        return Err(
            "cannot generate an interview report before the session has transcript content".into(),
        );
    }

    let resolved = resolve_provider_config_from_parts(
        workspace_root,
        input.provider.as_deref(),
        input.model.as_deref(),
        input.base_url.as_deref(),
    )?;
    let locale = normalize_interview_locale(input.locale.as_deref());
    let client = reqwest::Client::new();
    let response_json = match resolved.provider.as_str() {
        "openai" => {
            let endpoint = format!(
                "{}/chat/completions",
                resolved.base_url.trim_end_matches('/')
            );
            request_openai_json_completion(
                &client,
                &endpoint,
                &resolved,
                &build_interview_report_system_prompt(&locale),
                &build_interview_report_user_prompt(&session, &locale),
            )
            .await?
        }
        "anthropic" => {
            let endpoint = format!("{}/v1/messages", resolved.base_url.trim_end_matches('/'));
            request_anthropic_json_completion(
                &client,
                &endpoint,
                &resolved,
                &build_interview_report_system_prompt(&locale),
                &build_interview_report_user_prompt(&session, &locale),
            )
            .await?
        }
        other => {
            return Err(format!(
                "provider '{other}' is not supported for interview report generation."
            ));
        }
    };
    let parsed: InterviewReportModelOutput = serde_json::from_value(response_json)
        .map_err(|error| format!("failed to parse interview report JSON response: {error}"))?;

    storage::save_interview_report(
        app,
        storage::SaveInterviewReportInput {
            session_id,
            overall_score: parsed.overall_score.clamp(0, 100),
            summary: parsed.summary.trim().to_string(),
            overall_feedback: parsed.overall_feedback.trim().to_string(),
            improvement_suggestions: parsed
                .improvement_suggestions
                .into_iter()
                .map(|item| item.trim().to_string())
                .filter(|item| !item.is_empty())
                .collect(),
            weak_points: parsed
                .weak_points
                .into_iter()
                .map(|item| storage::InterviewWeakPointRecord {
                    title: item.title.trim().to_string(),
                    evidence: item.evidence.trim().to_string(),
                    severity: normalize_priority_or_severity(&item.severity),
                    training_focus: item.training_focus.trim().to_string(),
                })
                .filter(|item| !item.title.is_empty())
                .collect(),
            training_plan: parsed
                .training_plan
                .into_iter()
                .map(|item| storage::InterviewTrainingPlanItemRecord {
                    title: item.title.trim().to_string(),
                    description: item.description.trim().to_string(),
                    priority: normalize_priority_or_severity(&item.priority),
                    drills: item
                        .drills
                        .into_iter()
                        .map(|drill| drill.trim().to_string())
                        .filter(|drill| !drill.is_empty())
                        .collect(),
                })
                .filter(|item| !item.title.is_empty())
                .collect(),
        },
    )
}

async fn evaluate_interview_answer(
    client: &reqwest::Client,
    config: &ResolvedProviderConfig,
    session: &storage::InterviewSessionDetail,
    round: &storage::InterviewRoundDetail,
    candidate_message: &storage::InterviewMessageItem,
    interviewer_response: &str,
    locale: &str,
) -> Result<InterviewAnswerEvaluationModelOutput, String> {
    let system_prompt = build_interview_answer_evaluation_system_prompt(locale);
    let user_prompt = build_interview_answer_evaluation_user_prompt(
        session,
        round,
        candidate_message,
        interviewer_response,
        locale,
    );
    let response_json = match config.provider.as_str() {
        "openai" => {
            let endpoint = format!("{}/chat/completions", config.base_url.trim_end_matches('/'));
            request_openai_json_completion(client, &endpoint, config, &system_prompt, &user_prompt)
                .await?
        }
        "anthropic" => {
            let endpoint = format!("{}/v1/messages", config.base_url.trim_end_matches('/'));
            request_anthropic_json_completion(
                client,
                &endpoint,
                config,
                &system_prompt,
                &user_prompt,
            )
            .await?
        }
        other => {
            return Err(format!(
                "provider '{other}' is not supported for interview answer evaluation."
            ));
        }
    };

    let mut parsed: InterviewAnswerEvaluationModelOutput = serde_json::from_value(response_json)
        .map_err(|error| format!("failed to parse interview answer evaluation JSON: {error}"))?;
    parsed.overall_score = parsed.overall_score.clamp(0, 100);
    parsed.summary = parsed.summary.trim().to_string();
    parsed.dimensions = parsed
        .dimensions
        .into_iter()
        .map(|dimension| InterviewAnswerEvaluationDimensionOutput {
            id: dimension.id.trim().to_string(),
            label: dimension.label.trim().to_string(),
            score: dimension.score.clamp(0, 100),
            feedback: dimension.feedback.trim().to_string(),
        })
        .filter(|dimension| !dimension.id.is_empty() && !dimension.label.is_empty())
        .collect();
    parsed.strengths = clean_string_list(parsed.strengths);
    parsed.risk_points = clean_string_list(parsed.risk_points);
    parsed.follow_up_question = parsed
        .follow_up_question
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    parsed.training_suggestions = clean_string_list(parsed.training_suggestions);
    Ok(parsed)
}

async fn run_interview_turn_stream(
    app: &AppHandle,
    _workspace_root: &std::path::Path,
    config: ResolvedProviderConfig,
    request_id: String,
    started_at_epoch_ms: u64,
    session_id: String,
    requested_round_id: Option<String>,
    kind: InterviewTurnKind,
    message: Option<String>,
    metadata: Option<Value>,
    locale: String,
) -> Result<(), String> {
    let session = storage::get_interview_session(app, &session_id)?
        .ok_or_else(|| format!("interview session not found: {session_id}"))?;
    if session.rounds.is_empty() {
        return Err(format!("interview session has no rounds: {session_id}"));
    }
    if session.status == "completed" {
        return Err("this interview session is already completed".into());
    }

    let round = resolve_interview_round_for_turn(&session, requested_round_id.as_deref())?;
    if matches!(round.status.as_str(), "completed" | "skipped") {
        return Err(format!(
            "interview round {} is already closed with status '{}'",
            round.id, round.status
        ));
    }
    let pending_message = build_interview_input_message(&kind, message, metadata, &locale)?;
    let mut candidate_message_for_evaluation: Option<storage::InterviewMessageItem> = None;
    let start_message_inserted = if matches!(kind, InterviewTurnKind::Start) {
        storage::add_interview_start_message_once(
            app,
            storage::AddInterviewMessageInput {
                round_id: round.id.clone(),
                role: pending_message.0,
                content: pending_message.1,
                metadata: Some(pending_message.2),
            },
        )?
        .is_some()
    } else {
        let inserted_message = storage::add_interview_message(
            app,
            storage::AddInterviewMessageInput {
                round_id: round.id.clone(),
                role: pending_message.0,
                content: pending_message.1,
                metadata: Some(pending_message.2),
            },
        )?;
        if matches!(kind, InterviewTurnKind::Answer) {
            candidate_message_for_evaluation = Some(inserted_message);
        }
        true
    };

    if !start_message_inserted {
        emit_empty_stream_completion(app, &request_id, &config, started_at_epoch_ms)?;
        return Ok(());
    }
    storage::mark_interview_round_in_progress(app, &session.id, &round.id)?;

    let refreshed_session = storage::get_interview_session(app, &session_id)?
        .ok_or_else(|| format!("interview session not found after turn setup: {session_id}"))?;
    let refreshed_round =
        resolve_interview_round_for_turn(&refreshed_session, Some(round.id.as_str()))?;
    let resume_context = build_resume_context(app, refreshed_session.resume_id.as_deref())?;
    let messages = build_interview_messages(
        &refreshed_session,
        &refreshed_round,
        resume_context,
        &locale,
    );

    emit_stream_event(
        app,
        DesktopAiStreamEvent {
            request_id: request_id.clone(),
            provider: config.provider.clone(),
            model: config.model.clone(),
            kind: DesktopAiStreamEventKind::Started,
            started_at_epoch_ms,
            emitted_at_epoch_ms: now_epoch_ms()?,
            finished_at_epoch_ms: None,
            chunk_index: Some(0),
            delta_text: None,
            accumulated_text: Some(String::new()),
            accumulated_thinking: None,
            error_message: None,
            tool_call: None,
        },
    )?;

    let client = reqwest::Client::new();
    let mut accumulated_text = String::new();
    let mut accumulated_thinking = String::new();
    let mut chunk_index = 0u32;
    let outcome = match config.provider.as_str() {
        "openai" => {
            let endpoint = format!("{}/chat/completions", config.base_url.trim_end_matches('/'));
            stream_openai_round(
                app,
                &client,
                &endpoint,
                &request_id,
                &config,
                started_at_epoch_ms,
                &messages,
                None,
                &mut accumulated_text,
                &mut accumulated_thinking,
                &mut chunk_index,
                false,
            )
            .await?
        }
        "anthropic" => {
            let endpoint = format!("{}/v1/messages", config.base_url.trim_end_matches('/'));
            let (system_prompt, anthropic_messages) = split_anthropic_system_prompt(&messages);
            stream_anthropic_round(
                app,
                &client,
                &endpoint,
                &request_id,
                &config,
                started_at_epoch_ms,
                &anthropic_messages,
                system_prompt.as_deref(),
                None,
                &mut accumulated_text,
                &mut accumulated_thinking,
                &mut chunk_index,
                false,
            )
            .await?
        }
        unsupported => {
            return Err(format!(
                "provider '{unsupported}' is not wired for native interview streaming yet."
            ));
        }
    };

    let raw_text = outcome.assistant_text.trim().to_string();
    let is_round_complete =
        raw_text.contains("[ROUND_COMPLETE]") || matches!(kind, InterviewTurnKind::EndRound);
    let cleaned_text = sanitize_interview_response(&raw_text);
    let persisted_text = if cleaned_text.is_empty() {
        raw_text.clone()
    } else {
        cleaned_text.clone()
    };

    if !persisted_text.trim().is_empty() {
        storage::add_interview_message(
            app,
            storage::AddInterviewMessageInput {
                round_id: refreshed_round.id.clone(),
                role: "interviewer".into(),
                content: persisted_text.clone(),
                metadata: Some(json!({ "turnKind": interview_turn_kind_label(&kind) })),
            },
        )?;
    }

    if should_increment_interview_question_count(&kind) {
        storage::increment_interview_round_question_count(app, &refreshed_round.id)?;
    }

    if let Some(candidate_message) = candidate_message_for_evaluation {
        match evaluate_interview_answer(
            &client,
            &config,
            &refreshed_session,
            &refreshed_round,
            &candidate_message,
            persisted_text.as_str(),
            &locale,
        )
        .await
        {
            Ok(evaluation) => {
                let _ = storage::update_interview_message_metadata(
                    app,
                    storage::UpdateInterviewMessageMetadataInput {
                        message_id: candidate_message.id,
                        metadata: json!({
                            "answerEvaluation": evaluation,
                        }),
                    },
                );
            }
            Err(error) => {
                let _ = storage::update_interview_message_metadata(
                    app,
                    storage::UpdateInterviewMessageMetadataInput {
                        message_id: candidate_message.id,
                        metadata: json!({
                            "answerEvaluationError": error,
                        }),
                    },
                );
            }
        }
    }

    if is_round_complete {
        let summary = extract_round_summary(&persisted_text);
        let _ = storage::complete_interview_round(
            app,
            &refreshed_session.id,
            &refreshed_round.id,
            summary,
            false,
        )?;
    }

    emit_stream_event(
        app,
        DesktopAiStreamEvent {
            request_id,
            provider: config.provider,
            model: config.model,
            kind: DesktopAiStreamEventKind::Completed,
            started_at_epoch_ms,
            emitted_at_epoch_ms: now_epoch_ms()?,
            finished_at_epoch_ms: Some(now_epoch_ms()?),
            chunk_index: Some(chunk_index),
            delta_text: None,
            accumulated_text: Some(if cleaned_text.is_empty() {
                accumulated_text
            } else {
                cleaned_text
            }),
            accumulated_thinking: Some(accumulated_thinking),
            error_message: None,
            tool_call: None,
        },
    )?;

    Ok(())
}

fn resolve_provider_config(
    workspace_root: &std::path::Path,
    input: &StartAiPromptStreamInput,
) -> Result<ResolvedProviderConfig, String> {
    resolve_provider_config_from_parts(
        workspace_root,
        Some(input.provider.as_str()),
        input.model.as_deref(),
        input.base_url.as_deref(),
    )
}

fn resolve_provider_config_from_parts(
    workspace_root: &std::path::Path,
    provider_override: Option<&str>,
    model_override: Option<&str>,
    base_url_override: Option<&str>,
) -> Result<ResolvedProviderConfig, String> {
    let settings_document = settings::load_or_initialize_settings(workspace_root)?;
    let provider = if provider_override.unwrap_or_default().trim().is_empty() {
        settings_document.ai.default_provider.trim().to_string()
    } else {
        normalize_supported_provider(provider_override.unwrap_or_default()).ok_or_else(|| {
            format!(
                "provider '{}' is not part of the desktop runtime contract",
                provider_override.unwrap_or_default().trim()
            )
        })?
    };
    let configured = settings_document.ai.provider_configs.get(&provider);
    let base_url = base_url_override
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .or_else(|| configured.map(|value| value.base_url.trim().to_string()))
        .unwrap_or_else(|| default_base_url_for_provider(&provider).to_string());
    let model = model_override
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .or_else(|| configured.map(|value| value.model.trim().to_string()))
        .unwrap_or_else(|| default_model_for_provider(&provider).to_string());
    let api_key_secret_key = format!("provider.{provider}.api_key");
    let api_key = settings::read_secret_value(workspace_root, &api_key_secret_key)?
        .unwrap_or_default()
        .trim()
        .to_string();

    if api_key.is_empty() {
        return Err(format!(
            "No API key is configured for provider '{provider}'. Save `{api_key_secret_key}` first."
        ));
    }

    Ok(ResolvedProviderConfig {
        provider,
        base_url,
        model,
        api_key,
    })
}

async fn run_openai_compatible_stream(
    app: &AppHandle,
    workspace_root: &std::path::Path,
    request_id: &str,
    prompt: &str,
    system_prompt: Option<&str>,
    document_id: Option<&str>,
    conversation: &[DesktopAiConversationMessage],
    images: &[String],
    config: &ResolvedProviderConfig,
    started_at_epoch_ms: u64,
    thinking_enabled: bool,
) -> Result<(), String> {
    emit_stream_event(
        app,
        DesktopAiStreamEvent {
            request_id: request_id.to_string(),
            provider: config.provider.clone(),
            model: config.model.clone(),
            kind: DesktopAiStreamEventKind::Started,
            started_at_epoch_ms,
            emitted_at_epoch_ms: now_epoch_ms()?,
            finished_at_epoch_ms: None,
            chunk_index: Some(0),
            delta_text: None,
            accumulated_text: Some(String::new()),
            accumulated_thinking: None,
            error_message: None,
            tool_call: None,
        },
    )?;

    let client = reqwest::Client::new();
    let endpoint = format!("{}/chat/completions", config.base_url.trim_end_matches('/'));
    let mut messages = Vec::new();
    let tools = build_resume_tools(document_id);
    if let Some(system_prompt) = system_prompt.filter(|value| !value.trim().is_empty()) {
        messages.push(json!({
            "role": "system",
            "content": system_prompt,
        }));
    }
    push_conversation_messages(&mut messages, conversation);
    let prompt_with_web_context = enrich_prompt_with_exa_context(
        app,
        request_id,
        config,
        started_at_epoch_ms,
        &client,
        workspace_root,
        prompt,
    )
    .await;
    let user_content = if images.is_empty() {
        json!(prompt_with_web_context)
    } else {
        let mut content_parts = Vec::with_capacity(images.len() + 1);
        for image_url in images {
            content_parts.push(json!({
                "type": "image_url",
                "image_url": {
                    "url": image_url,
                },
            }));
        }
        content_parts.push(json!({
            "type": "text",
            "text": prompt_with_web_context,
        }));
        json!(content_parts)
    };
    messages.push(json!({
        "role": "user",
        "content": user_content,
    }));

    let mut accumulated_text = String::new();
    let mut accumulated_thinking = String::new();
    let mut chunk_index = 0u32;
    let mut tool_rounds = 0usize;

    loop {
        let round_outcome = stream_openai_round(
            app,
            &client,
            &endpoint,
            request_id,
            config,
            started_at_epoch_ms,
            &messages,
            tools.as_ref(),
            &mut accumulated_text,
            &mut accumulated_thinking,
            &mut chunk_index,
            thinking_enabled,
        )
        .await?;

        if round_outcome.tool_calls.is_empty() {
            break;
        }

        tool_rounds += 1;
        if tool_rounds > MAX_TOOL_ROUNDS {
            return Err(format!(
                "resume tool execution exceeded the desktop safety limit of {MAX_TOOL_ROUNDS} rounds"
            ));
        }

        let assistant_text = round_outcome.assistant_text.trim().to_string();
        let has_assistant_text = !assistant_text.is_empty();

        let tool_calls_payload = round_outcome
            .tool_calls
            .iter()
            .map(|tool_call| {
                json!({
                    "id": tool_call.id,
                    "type": "function",
                    "function": {
                        "name": tool_call.name,
                        "arguments": tool_call.arguments.to_string(),
                    }
                })
            })
            .collect::<Vec<_>>();

        let mut assistant_message = json!({
            "role": "assistant",
            "content": if has_assistant_text {
                json!(assistant_text)
            } else {
                serde_json::Value::Null
            },
            "tool_calls": tool_calls_payload,
        });
        if !has_assistant_text {
            assistant_message["content"] = serde_json::Value::Null;
        }
        messages.push(assistant_message);

        let Some(active_document_id) = document_id else {
            return Err("resume-editing tools require a documentId in the desktop runtime".into());
        };

        for tool_call in round_outcome.tool_calls {
            emit_tool_call_event(
                app,
                request_id,
                config,
                started_at_epoch_ms,
                DesktopAiToolCallPayload {
                    tool_call_id: tool_call.id.clone(),
                    tool_name: tool_call.name.clone(),
                    state: DesktopAiToolCallState::InputStreaming,
                    input: Some(tool_call.arguments.clone()),
                    output: None,
                    error_text: None,
                },
            );

            match execute_resume_tool(app, active_document_id, &tool_call) {
                Ok(result) => {
                    emit_tool_call_event(
                        app,
                        request_id,
                        config,
                        started_at_epoch_ms,
                        DesktopAiToolCallPayload {
                            tool_call_id: tool_call.id.clone(),
                            tool_name: tool_call.name.clone(),
                            state: DesktopAiToolCallState::OutputAvailable,
                            input: Some(tool_call.arguments.clone()),
                            output: Some(result.clone()),
                            error_text: None,
                        },
                    );

                    messages.push(json!({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": result.to_string(),
                    }));
                }
                Err(error) => {
                    emit_tool_call_event(
                        app,
                        request_id,
                        config,
                        started_at_epoch_ms,
                        DesktopAiToolCallPayload {
                            tool_call_id: tool_call.id.clone(),
                            tool_name: tool_call.name.clone(),
                            state: DesktopAiToolCallState::OutputError,
                            input: Some(tool_call.arguments.clone()),
                            output: None,
                            error_text: Some(error.clone()),
                        },
                    );

                    messages.push(json!({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json!({
                            "success": false,
                            "error": error,
                        }).to_string(),
                    }));
                }
            }
        }
    }

    emit_stream_event(
        app,
        DesktopAiStreamEvent {
            request_id: request_id.to_string(),
            provider: config.provider.clone(),
            model: config.model.clone(),
            kind: DesktopAiStreamEventKind::Completed,
            started_at_epoch_ms,
            emitted_at_epoch_ms: now_epoch_ms()?,
            finished_at_epoch_ms: Some(now_epoch_ms()?),
            chunk_index: Some(chunk_index),
            delta_text: None,
            accumulated_text: Some(accumulated_text),
            accumulated_thinking: Some(accumulated_thinking),
            error_message: None,
            tool_call: None,
        },
    )?;

    Ok(())
}

async fn stream_openai_round(
    app: &AppHandle,
    client: &reqwest::Client,
    endpoint: &str,
    request_id: &str,
    config: &ResolvedProviderConfig,
    started_at_epoch_ms: u64,
    messages: &[serde_json::Value],
    tools: Option<&serde_json::Value>,
    accumulated_text: &mut String,
    accumulated_thinking: &mut String,
    chunk_index: &mut u32,
    thinking_enabled: bool,
) -> Result<OpenAiRoundOutcome, String> {
    let mut payload = json!({
        "model": config.model,
        "stream": true,
        "messages": messages,
    });

    if let Some(tools) = tools {
        payload["tools"] = tools.clone();
        if should_force_resume_text_tool(messages) {
            payload["tool_choice"] = json!({
                "type": "function",
                "function": {
                    "name": "replaceResumeText"
                }
            });
        }
    }

    if thinking_enabled {
        payload["thinking"] = json!({"type": "enabled"});
    }

    let response = client
        .post(endpoint)
        .bearer_auth(&config.api_key)
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|error| format!("failed to call {endpoint}: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| String::from("failed to read upstream error body"));
        return Err(format!("provider returned {status}: {body}"));
    }

    let mut event_buffer = SseEventBuffer::default();
    let mut round_text = String::new();
    let mut response_stream = response.bytes_stream();
    let mut tool_calls = BTreeMap::<usize, StreamingToolCall>::new();

    while let Some(chunk_result) = response_stream.next().await {
        let chunk =
            chunk_result.map_err(|error| format!("failed to read stream chunk: {error}"))?;
        for event_payload in event_buffer.push(chunk.as_ref()) {
            let Some(data_payload) = extract_sse_data_payload(&event_payload) else {
                continue;
            };

            if data_payload == "[DONE]" {
                return Ok(OpenAiRoundOutcome {
                    assistant_text: round_text,
                    tool_calls: finalize_tool_calls(tool_calls)?,
                });
            }

            if let Some(delta_text) = extract_openai_delta_text(&data_payload) {
                if !delta_text.is_empty() {
                    *chunk_index += 1;
                    round_text.push_str(&delta_text);
                    accumulated_text.push_str(&delta_text);
                    emit_stream_event(
                        app,
                        DesktopAiStreamEvent {
                            request_id: request_id.to_string(),
                            provider: config.provider.clone(),
                            model: config.model.clone(),
                            kind: DesktopAiStreamEventKind::Delta,
                            started_at_epoch_ms,
                            emitted_at_epoch_ms: now_epoch_ms()?,
                            finished_at_epoch_ms: None,
                            chunk_index: Some(*chunk_index),
                            delta_text: Some(delta_text),
                            accumulated_text: Some(accumulated_text.clone()),
                            accumulated_thinking: None,
                            error_message: None,
                            tool_call: None,
                        },
                    )?;
                }
            }

            if let Some(thinking_text) = extract_openai_reasoning_content(&data_payload) {
                if !thinking_text.is_empty() {
                    *chunk_index += 1;
                    accumulated_thinking.push_str(&thinking_text);
                    emit_stream_event(
                        app,
                        DesktopAiStreamEvent {
                            request_id: request_id.to_string(),
                            provider: config.provider.clone(),
                            model: config.model.clone(),
                            kind: DesktopAiStreamEventKind::DeltaThinking,
                            started_at_epoch_ms,
                            emitted_at_epoch_ms: now_epoch_ms()?,
                            finished_at_epoch_ms: None,
                            chunk_index: Some(*chunk_index),
                            delta_text: Some(thinking_text),
                            accumulated_text: None,
                            accumulated_thinking: Some(accumulated_thinking.clone()),
                            error_message: None,
                            tool_call: None,
                        },
                    )?;
                }
            }

            for tool_call_delta in extract_openai_tool_call_deltas(&data_payload) {
                merge_tool_call_delta(&mut tool_calls, tool_call_delta);
            }
        }
    }

    Ok(OpenAiRoundOutcome {
        assistant_text: round_text,
        tool_calls: finalize_tool_calls(tool_calls)?,
    })
}

async fn run_anthropic_stream(
    app: &AppHandle,
    workspace_root: &std::path::Path,
    request_id: &str,
    prompt: &str,
    system_prompt: Option<&str>,
    document_id: Option<&str>,
    conversation: &[DesktopAiConversationMessage],
    images: &[String],
    config: &ResolvedProviderConfig,
    started_at_epoch_ms: u64,
    thinking_enabled: bool,
) -> Result<(), String> {
    emit_stream_event(
        app,
        DesktopAiStreamEvent {
            request_id: request_id.to_string(),
            provider: config.provider.clone(),
            model: config.model.clone(),
            kind: DesktopAiStreamEventKind::Started,
            started_at_epoch_ms,
            emitted_at_epoch_ms: now_epoch_ms()?,
            finished_at_epoch_ms: None,
            chunk_index: Some(0),
            delta_text: None,
            accumulated_text: Some(String::new()),
            accumulated_thinking: None,
            error_message: None,
            tool_call: None,
        },
    )?;

    let client = reqwest::Client::new();
    let endpoint = format!("{}/v1/messages", config.base_url.trim_end_matches('/'));
    let tools = build_anthropic_resume_tools(document_id);
    let mut messages = Vec::new();
    for msg in conversation {
        let content = msg.content.trim();
        if content.is_empty() {
            continue;
        }
        messages.push(json!({
            "role": msg.role.as_str(),
            "content": content,
        }));
    }

    let prompt_with_web_context = enrich_prompt_with_exa_context(
        app,
        request_id,
        config,
        started_at_epoch_ms,
        &client,
        workspace_root,
        prompt,
    )
    .await;

    let user_content = if images.is_empty() {
        json!(prompt_with_web_context)
    } else {
        let mut content_parts = Vec::with_capacity(images.len() + 1);
        for image_url in images {
            if let Some(data_url) = image_url.strip_prefix("data:") {
                let (media_part, raw) = data_url.split_once(',').unwrap_or(("", data_url));
                let media_type = media_part
                    .split_once(';')
                    .map(|(mt, _)| mt)
                    .unwrap_or("image/png");
                content_parts.push(json!({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": raw,
                    }
                }));
            } else {
                content_parts.push(json!({
                    "type": "image",
                    "source": {
                        "type": "url",
                        "url": image_url,
                    }
                }));
            }
        }
        content_parts.push(json!({
            "type": "text",
            "text": prompt_with_web_context,
        }));
        json!(content_parts)
    };
    messages.push(json!({
        "role": "user",
        "content": user_content,
    }));

    let mut accumulated_text = String::new();
    let mut accumulated_thinking = String::new();
    let mut chunk_index = 0u32;
    let mut tool_rounds = 0usize;

    loop {
        let round_outcome = stream_anthropic_round(
            app,
            &client,
            &endpoint,
            request_id,
            config,
            started_at_epoch_ms,
            &messages,
            system_prompt,
            tools.as_ref(),
            &mut accumulated_text,
            &mut accumulated_thinking,
            &mut chunk_index,
            thinking_enabled,
        )
        .await?;

        if round_outcome.tool_calls.is_empty() {
            break;
        }

        tool_rounds += 1;
        if tool_rounds > MAX_TOOL_ROUNDS {
            return Err(format!(
                "resume tool execution exceeded the desktop safety limit of {MAX_TOOL_ROUNDS} rounds"
            ));
        }

        let assistant_content = build_anthropic_assistant_tool_message_content(&round_outcome);
        messages.push(json!({
            "role": "assistant",
            "content": assistant_content,
        }));

        let Some(active_document_id) = document_id else {
            return Err("resume-editing tools require a documentId in the desktop runtime".into());
        };

        let mut tool_results = Vec::new();
        for tool_call in round_outcome.tool_calls {
            emit_tool_call_event(
                app,
                request_id,
                config,
                started_at_epoch_ms,
                DesktopAiToolCallPayload {
                    tool_call_id: tool_call.id.clone(),
                    tool_name: tool_call.name.clone(),
                    state: DesktopAiToolCallState::InputStreaming,
                    input: Some(tool_call.arguments.clone()),
                    output: None,
                    error_text: None,
                },
            );

            match execute_resume_tool(app, active_document_id, &tool_call) {
                Ok(result) => {
                    emit_tool_call_event(
                        app,
                        request_id,
                        config,
                        started_at_epoch_ms,
                        DesktopAiToolCallPayload {
                            tool_call_id: tool_call.id.clone(),
                            tool_name: tool_call.name.clone(),
                            state: DesktopAiToolCallState::OutputAvailable,
                            input: Some(tool_call.arguments.clone()),
                            output: Some(result.clone()),
                            error_text: None,
                        },
                    );

                    tool_results.push(json!({
                        "type": "tool_result",
                        "tool_use_id": tool_call.id,
                        "content": result.to_string(),
                    }));
                }
                Err(error) => {
                    emit_tool_call_event(
                        app,
                        request_id,
                        config,
                        started_at_epoch_ms,
                        DesktopAiToolCallPayload {
                            tool_call_id: tool_call.id.clone(),
                            tool_name: tool_call.name.clone(),
                            state: DesktopAiToolCallState::OutputError,
                            input: Some(tool_call.arguments.clone()),
                            output: None,
                            error_text: Some(error.clone()),
                        },
                    );

                    tool_results.push(json!({
                        "type": "tool_result",
                        "tool_use_id": tool_call.id,
                        "is_error": true,
                        "content": json!({
                            "success": false,
                            "error": error,
                        }).to_string(),
                    }));
                }
            }
        }

        messages.push(json!({
            "role": "user",
            "content": tool_results,
        }));
    }

    emit_stream_event(
        app,
        DesktopAiStreamEvent {
            request_id: request_id.to_string(),
            provider: config.provider.clone(),
            model: config.model.clone(),
            kind: DesktopAiStreamEventKind::Completed,
            started_at_epoch_ms,
            emitted_at_epoch_ms: now_epoch_ms()?,
            finished_at_epoch_ms: Some(now_epoch_ms()?),
            chunk_index: Some(chunk_index),
            delta_text: None,
            accumulated_text: Some(accumulated_text.clone()),
            accumulated_thinking: Some(accumulated_thinking),
            error_message: None,
            tool_call: None,
        },
    )?;

    Ok(())
}

async fn stream_anthropic_round(
    app: &AppHandle,
    client: &reqwest::Client,
    endpoint: &str,
    request_id: &str,
    config: &ResolvedProviderConfig,
    started_at_epoch_ms: u64,
    messages: &[serde_json::Value],
    system_prompt: Option<&str>,
    tools: Option<&serde_json::Value>,
    accumulated_text: &mut String,
    accumulated_thinking: &mut String,
    chunk_index: &mut u32,
    thinking_enabled: bool,
) -> Result<OpenAiRoundOutcome, String> {
    let mut payload = json!({
        "model": config.model,
        "stream": true,
        "messages": messages,
        "max_tokens": if thinking_enabled { 16384 } else { 8192 },
    });

    if let Some(system) = system_prompt.filter(|s| !s.trim().is_empty()) {
        payload["system"] = json!(system);
    }

    if let Some(tools) = tools {
        payload["tools"] = tools.clone();
        if should_force_resume_text_tool(messages) {
            payload["tool_choice"] = json!({
                "type": "tool",
                "name": "replaceResumeText"
            });
        }
    }

    if thinking_enabled && !should_force_resume_text_tool(messages) {
        payload["thinking"] = json!({
            "type": "enabled",
            "budget_tokens": 10000,
        });
    }

    let response = client
        .post(endpoint)
        .header("x-api-key", &config.api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|error| format!("failed to call Anthropic {endpoint}: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| String::from("failed to read upstream error body"));
        return Err(format!("Anthropic returned {status}: {body}"));
    }

    let mut event_buffer = SseEventBuffer::default();
    let mut round_text = String::new();
    let mut response_stream = response.bytes_stream();
    let mut anthropic_state = AnthropicStreamingState::default();

    while let Some(chunk_result) = response_stream.next().await {
        let chunk =
            chunk_result.map_err(|error| format!("failed to read stream chunk: {error}"))?;
        for event_payload in event_buffer.push(chunk.as_ref()) {
            let Some((event_type, data_payload)) = extract_anthropic_sse_event(&event_payload)
            else {
                continue;
            };

            let (delta_text, delta_thinking) =
                handle_anthropic_sse_event(&event_type, &data_payload, &mut anthropic_state)?;

            if let Some(text) = delta_text {
                if !text.is_empty() {
                    *chunk_index += 1;
                    round_text.push_str(&text);
                    accumulated_text.push_str(&text);
                    emit_stream_event(
                        app,
                        DesktopAiStreamEvent {
                            request_id: request_id.to_string(),
                            provider: config.provider.clone(),
                            model: config.model.clone(),
                            kind: DesktopAiStreamEventKind::Delta,
                            started_at_epoch_ms,
                            emitted_at_epoch_ms: now_epoch_ms()?,
                            finished_at_epoch_ms: None,
                            chunk_index: Some(*chunk_index),
                            delta_text: Some(text),
                            accumulated_text: Some(accumulated_text.clone()),
                            accumulated_thinking: None,
                            error_message: None,
                            tool_call: None,
                        },
                    )?;
                }
            }

            if let Some(thinking) = delta_thinking {
                if !thinking.is_empty() {
                    *chunk_index += 1;
                    accumulated_thinking.push_str(&thinking);
                    emit_stream_event(
                        app,
                        DesktopAiStreamEvent {
                            request_id: request_id.to_string(),
                            provider: config.provider.clone(),
                            model: config.model.clone(),
                            kind: DesktopAiStreamEventKind::DeltaThinking,
                            started_at_epoch_ms,
                            emitted_at_epoch_ms: now_epoch_ms()?,
                            finished_at_epoch_ms: None,
                            chunk_index: Some(*chunk_index),
                            delta_text: Some(thinking),
                            accumulated_text: None,
                            accumulated_thinking: Some(accumulated_thinking.clone()),
                            error_message: None,
                            tool_call: None,
                        },
                    )?;
                }
            }

            if event_type == "message_stop" {
                return Ok(OpenAiRoundOutcome {
                    assistant_text: round_text,
                    tool_calls: anthropic_state.finalize_tool_calls()?,
                });
            }
        }
    }

    Ok(OpenAiRoundOutcome {
        assistant_text: round_text,
        tool_calls: anthropic_state.finalize_tool_calls()?,
    })
}

fn build_anthropic_assistant_tool_message_content(
    round_outcome: &OpenAiRoundOutcome,
) -> serde_json::Value {
    let mut content = Vec::new();

    let assistant_text = round_outcome.assistant_text.trim();
    if !assistant_text.is_empty() {
        content.push(json!({
            "type": "text",
            "text": assistant_text,
        }));
    }

    content.extend(round_outcome.tool_calls.iter().map(|tool_call| {
        json!({
            "type": "tool_use",
            "id": tool_call.id.clone(),
            "name": tool_call.name.clone(),
            "input": tool_call.arguments.clone(),
        })
    }));

    json!(content)
}

fn should_force_resume_text_tool(messages: &[serde_json::Value]) -> bool {
    if messages.iter().any(|message| {
        message.get("role").and_then(|value| value.as_str()) == Some("tool")
            || message_contains_anthropic_tool_result(message)
    }) {
        return false;
    }

    let Some(user_text) = messages
        .iter()
        .rev()
        .find(|message| message.get("role").and_then(|value| value.as_str()) == Some("user"))
        .and_then(|message| message.get("content"))
        .map(extract_message_text)
    else {
        return false;
    };

    let intent_text = user_text
        .split("\n\nResume context:")
        .next()
        .unwrap_or(&user_text)
        .to_lowercase();

    [
        "润色", "优化", "改写", "重写", "修改", "调整", "完善", "提升", "增强", "精简", "扩写",
        "应用", "polish", "rewrite", "optimize", "improve", "modify", "revise", "refine",
        "enhance", "shorten", "expand", "apply",
    ]
    .iter()
    .any(|keyword| intent_text.contains(keyword))
}

fn message_contains_anthropic_tool_result(message: &serde_json::Value) -> bool {
    message
        .get("content")
        .and_then(|content| content.as_array())
        .is_some_and(|items| {
            items.iter().any(|item| {
                item.get("type").and_then(|value| value.as_str()) == Some("tool_result")
            })
        })
}

fn extract_message_text(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(text) => text.clone(),
        serde_json::Value::Array(parts) => parts
            .iter()
            .filter_map(|part| {
                part.get("text")
                    .and_then(|text| text.as_str())
                    .or_else(|| part.get("content").and_then(|content| content.as_str()))
            })
            .collect::<Vec<_>>()
            .join("\n"),
        _ => String::new(),
    }
}

fn build_resume_tools(document_id: Option<&str>) -> Option<serde_json::Value> {
    let document_id = document_id?.trim();
    if document_id.is_empty() {
        return None;
    }

    Some(json!([
        {
            "type": "function",
            "function": {
                "name": "replaceResumeText",
                "description": "Replace exact text inside existing resume sections without overwriting the whole section. Use this for resume rewrite, polish, optimization, or direct content edits. Each patch replaces the first exact originalText occurrence found in the target section content.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "patches": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "sectionId": {
                                        "type": "string",
                                        "description": "The exact sectionId from the resume context."
                                    },
                                    "originalText": {
                                        "type": "string",
                                        "description": "The exact original text to replace. It must exist verbatim in the target section content."
                                    },
                                    "replacementText": {
                                        "type": "string",
                                        "description": "The replacement text."
                                    },
                                    "reason": {
                                        "type": "string",
                                        "description": "Optional short explanation for the edit."
                                    }
                                },
                                "required": ["sectionId", "originalText", "replacementText"],
                                "additionalProperties": false
                            },
                            "minItems": 1
                        }
                    },
                    "required": ["patches"],
                    "additionalProperties": false
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "updateResumeMetadata",
                "description": "Update top-level resume metadata such as title, language, template, target job title, or target company.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": { "type": "string" },
                        "template": { "type": "string" },
                        "language": { "type": "string" },
                        "targetJobTitle": { "type": "string" },
                        "targetCompany": { "type": "string" }
                    },
                    "additionalProperties": false
                }
            }
        }
    ]))
}

fn build_anthropic_resume_tools(document_id: Option<&str>) -> Option<serde_json::Value> {
    let document_id = document_id?.trim();
    if document_id.is_empty() {
        return None;
    }

    Some(json!([
        {
            "name": "replaceResumeText",
            "description": "Replace exact text inside existing resume sections without overwriting the whole section. Use this for resume rewrite, polish, optimization, or direct content edits. Each patch replaces the first exact originalText occurrence found in the target section content.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "patches": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "sectionId": {
                                    "type": "string",
                                    "description": "The exact sectionId from the resume context."
                                },
                                "originalText": {
                                    "type": "string",
                                    "description": "The exact original text to replace. It must exist verbatim in the target section content."
                                },
                                "replacementText": {
                                    "type": "string",
                                    "description": "The replacement text."
                                },
                                "reason": {
                                    "type": "string",
                                    "description": "Optional short explanation for the edit."
                                }
                            },
                            "required": ["sectionId", "originalText", "replacementText"],
                            "additionalProperties": false
                        },
                        "minItems": 1
                    }
                },
                "required": ["patches"],
                "additionalProperties": false
            }
        },
        {
            "name": "updateResumeMetadata",
            "description": "Update top-level resume metadata such as title, language, template, target job title, or target company.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "title": { "type": "string" },
                    "template": { "type": "string" },
                    "language": { "type": "string" },
                    "targetJobTitle": { "type": "string" },
                    "targetCompany": { "type": "string" }
                },
                "additionalProperties": false
            }
        }
    ]))
}

fn extract_openai_tool_call_deltas(payload: &str) -> Vec<OpenAiToolCallDelta> {
    let Ok(value) = serde_json::from_str::<serde_json::Value>(payload) else {
        return Vec::new();
    };

    value
        .get("choices")
        .and_then(|choices| choices.as_array())
        .and_then(|choices| choices.first())
        .and_then(|choice| choice.get("delta"))
        .and_then(|delta| delta.get("tool_calls"))
        .and_then(|tool_calls| tool_calls.as_array())
        .map(|tool_calls| {
            tool_calls
                .iter()
                .filter_map(|tool_call| {
                    let index = tool_call.get("index")?.as_u64()? as usize;
                    let id = tool_call
                        .get("id")
                        .and_then(|value| value.as_str())
                        .map(ToString::to_string);
                    let name = tool_call
                        .get("function")
                        .and_then(|function| function.get("name"))
                        .and_then(|value| value.as_str())
                        .map(ToString::to_string);
                    let arguments_fragment = tool_call
                        .get("function")
                        .and_then(|function| function.get("arguments"))
                        .and_then(|value| value.as_str())
                        .map(ToString::to_string);

                    Some(OpenAiToolCallDelta {
                        index,
                        id,
                        name,
                        arguments_fragment,
                    })
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default()
}

fn merge_tool_call_delta(
    tool_calls: &mut BTreeMap<usize, StreamingToolCall>,
    delta: OpenAiToolCallDelta,
) {
    let entry = tool_calls.entry(delta.index).or_default();
    if let Some(id) = delta.id {
        entry.id = Some(id);
    }
    if let Some(name) = delta.name {
        entry.name = Some(name);
    }
    if let Some(arguments_fragment) = delta.arguments_fragment {
        entry.arguments.push_str(&arguments_fragment);
    }
}

fn finalize_tool_calls(
    tool_calls: BTreeMap<usize, StreamingToolCall>,
) -> Result<Vec<CompletedToolCall>, String> {
    tool_calls
        .into_values()
        .map(|tool_call| {
            let id = tool_call
                .id
                .filter(|value| !value.trim().is_empty())
                .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
            let name = tool_call
                .name
                .filter(|value| !value.trim().is_empty())
                .ok_or_else(|| "tool call was missing a function name".to_string())?;
            let arguments = if tool_call.arguments.trim().is_empty() {
                json!({})
            } else {
                serde_json::from_str::<serde_json::Value>(&tool_call.arguments).map_err(
                    |error| format!("failed to parse tool arguments for {name}: {error}"),
                )?
            };

            Ok(CompletedToolCall {
                id,
                name,
                arguments,
            })
        })
        .collect()
}

fn execute_resume_tool(
    app: &AppHandle,
    document_id: &str,
    tool_call: &CompletedToolCall,
) -> Result<serde_json::Value, String> {
    match tool_call.name.as_str() {
        "replaceResumeText" => {
            let input: ReplaceResumeTextToolInput =
                serde_json::from_value(tool_call.arguments.clone())
                    .map_err(|error| format!("invalid arguments for replaceResumeText: {error}"))?;
            execute_replace_resume_text_tool(app, document_id, input)
        }
        "updateSection" => {
            let input: UpdateSectionToolInput = serde_json::from_value(tool_call.arguments.clone())
                .map_err(|error| format!("invalid arguments for updateSection: {error}"))?;
            execute_update_section_tool(app, document_id, input)
        }
        "updateResumeMetadata" => {
            let input: UpdateResumeMetadataToolInput =
                serde_json::from_value(tool_call.arguments.clone()).map_err(|error| {
                    format!("invalid arguments for updateResumeMetadata: {error}")
                })?;
            execute_update_resume_metadata_tool(app, document_id, input)
        }
        other => Err(format!("unsupported desktop resume tool: {other}")),
    }
}

fn execute_replace_resume_text_tool(
    app: &AppHandle,
    document_id: &str,
    input: ReplaceResumeTextToolInput,
) -> Result<serde_json::Value, String> {
    if input.patches.is_empty() {
        return Err("replaceResumeText requires at least one patch".into());
    }

    let document = storage::get_document(app, document_id)?
        .ok_or_else(|| format!("document not found for text replacement: {document_id}"))?;
    let mut save_input = to_save_document_input(&document);
    let mut applied = Vec::new();
    let mut skipped_count = 0usize;

    for patch in input.patches {
        let section_id = patch.section_id.trim();
        let original_text = patch.original_text.trim();
        let replacement_text = patch.replacement_text.as_str();

        if section_id.is_empty() || original_text.is_empty() || replacement_text.trim().is_empty() {
            skipped_count += 1;
            continue;
        }

        let Some(target_section) = save_input
            .sections
            .iter_mut()
            .find(|section| section.id == section_id)
        else {
            skipped_count += 1;
            continue;
        };

        if replace_first_text_in_json(&mut target_section.content, original_text, replacement_text)
        {
            target_section.updated_at_epoch_ms = None;
            applied.push(json!({
                "sectionId": target_section.id,
                "sectionType": target_section.section_type,
                "title": target_section.title,
                "originalText": original_text,
                "replacementText": replacement_text,
                "reason": patch.reason,
            }));
        } else {
            skipped_count += 1;
        }
    }

    if applied.is_empty() {
        return Err("replaceResumeText did not find any originalText to replace".into());
    }

    let updated = storage::save_document(app, save_input)?;

    Ok(json!({
        "success": true,
        "documentId": updated.id,
        "appliedCount": applied.len(),
        "skippedCount": skipped_count,
        "patches": applied,
    }))
}

fn replace_first_text_in_json(
    value: &mut serde_json::Value,
    original_text: &str,
    replacement_text: &str,
) -> bool {
    match value {
        serde_json::Value::String(content) => {
            let Some(index) = content.find(original_text) else {
                return false;
            };
            content.replace_range(index..index + original_text.len(), replacement_text);
            true
        }
        serde_json::Value::Array(items) => items
            .iter_mut()
            .any(|item| replace_first_text_in_json(item, original_text, replacement_text)),
        serde_json::Value::Object(record) => record
            .values_mut()
            .any(|nested| replace_first_text_in_json(nested, original_text, replacement_text)),
        _ => false,
    }
}

fn execute_update_section_tool(
    app: &AppHandle,
    document_id: &str,
    input: UpdateSectionToolInput,
) -> Result<serde_json::Value, String> {
    if !input.content.is_object() {
        return Err("updateSection.content must be a JSON object".into());
    }

    let document = storage::get_document(app, document_id)?
        .ok_or_else(|| format!("document not found for tool execution: {document_id}"))?;
    let mut save_input = to_save_document_input(&document);
    let target_section = save_input
        .sections
        .iter_mut()
        .find(|section| section.id == input.section_id)
        .ok_or_else(|| format!("section not found: {}", input.section_id))?;

    target_section.content = input.content;
    target_section.updated_at_epoch_ms = None;

    if let Some(title) = input
        .title
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
    {
        target_section.title = title;
    }

    let updated = storage::save_document(app, save_input)?;
    let updated_section = updated
        .sections
        .iter()
        .find(|section| section.id == input.section_id)
        .ok_or_else(|| format!("updated section not found after save: {}", input.section_id))?;

    Ok(json!({
        "success": true,
        "documentId": updated.id,
        "sectionId": updated_section.id,
        "sectionType": updated_section.section_type,
        "title": updated_section.title,
    }))
}

fn execute_update_resume_metadata_tool(
    app: &AppHandle,
    document_id: &str,
    input: UpdateResumeMetadataToolInput,
) -> Result<serde_json::Value, String> {
    if input.title.is_none()
        && input.template.is_none()
        && input.language.is_none()
        && input.target_job_title.is_none()
        && input.target_company.is_none()
    {
        return Err("updateResumeMetadata requires at least one field to update".into());
    }

    let updated = storage::update_document(
        app,
        storage::UpdateDocumentInput {
            id: document_id.to_string(),
            title: input.title,
            template: input.template,
            language: input.language,
            theme_json: None,
            target_job_title: input.target_job_title,
            target_company: input.target_company,
        },
    )?;

    Ok(json!({
        "success": true,
        "documentId": updated.id,
        "title": updated.title,
        "template": updated.template,
        "language": updated.language,
        "targetJobTitle": updated.target_job_title,
        "targetCompany": updated.target_company,
    }))
}

fn to_save_document_input(document: &storage::DocumentDetail) -> storage::SaveDocumentInput {
    storage::SaveDocumentInput {
        id: document.id.clone(),
        title: document.title.clone(),
        template: document.template.clone(),
        language: document.language.clone(),
        theme_json: document.theme_json.clone(),
        target_job_title: document.target_job_title.clone(),
        target_company: document.target_company.clone(),
        sections: document
            .sections
            .iter()
            .map(|section| storage::SaveDocumentSectionInput {
                id: section.id.clone(),
                document_id: section.document_id.clone(),
                section_type: section.section_type.clone(),
                title: section.title.clone(),
                sort_order: section.sort_order,
                visible: section.visible,
                content: parse_json_object_or_default(&section.content_json),
                created_at_epoch_ms: Some(section.created_at_epoch_ms),
                updated_at_epoch_ms: Some(section.updated_at_epoch_ms),
            })
            .collect(),
    }
}

fn parse_json_object_or_default(raw: &str) -> serde_json::Value {
    match serde_json::from_str::<serde_json::Value>(raw) {
        Ok(value) if value.is_object() => value,
        Ok(_) | Err(_) => json!({}),
    }
}

fn push_conversation_messages(
    messages: &mut Vec<serde_json::Value>,
    conversation: &[DesktopAiConversationMessage],
) {
    for message in conversation {
        let content = message.content.trim();
        if content.is_empty() {
            continue;
        }

        messages.push(json!({
            "role": message.role.as_str(),
            "content": content,
        }));
    }
}

async fn enrich_prompt_with_exa_context(
    app: &AppHandle,
    request_id: &str,
    config: &ResolvedProviderConfig,
    started_at_epoch_ms: u64,
    client: &reqwest::Client,
    workspace_root: &std::path::Path,
    prompt: &str,
) -> String {
    let prompt_without_resume_context = prompt
        .split("\n\nResume context:\n")
        .next()
        .unwrap_or(prompt);
    let urls = extract_urls(prompt_without_resume_context);

    let Some(exa_config) = resolve_exa_config(workspace_root).ok().flatten() else {
        return prompt.to_string();
    };

    if !urls.is_empty() {
        let tool_call_id = format!("{request_id}-fetch-web-page");
        let tool_input = json!({
            "urls": urls,
            "text": true,
        });
        emit_tool_call_event(
            app,
            request_id,
            config,
            started_at_epoch_ms,
            DesktopAiToolCallPayload {
                tool_call_id: tool_call_id.clone(),
                tool_name: "fetchWebPage".into(),
                state: DesktopAiToolCallState::InputStreaming,
                input: Some(tool_input.clone()),
                output: None,
                error_text: None,
            },
        );

        return match fetch_webpage_context(client, &exa_config, &urls).await {
            Ok(outcome) => {
                emit_tool_call_event(
                    app,
                    request_id,
                    config,
                    started_at_epoch_ms,
                    DesktopAiToolCallPayload {
                        tool_call_id,
                        tool_name: "fetchWebPage".into(),
                        state: DesktopAiToolCallState::OutputAvailable,
                        input: Some(tool_input),
                        output: Some(outcome.tool_output.clone()),
                        error_text: None,
                    },
                );

                if let Some(web_context) = outcome.prompt_context {
                    format!(
                        "{prompt}\n\nFetched webpage context via Exa:\n{web_context}\n\nUse the fetched page content above to answer the user's request. Cite the relevant URLs you relied on. Do not claim that you cannot access the provided link when webpage context is included."
                    )
                } else {
                    prompt.to_string()
                }
            }
            Err(error) => {
                emit_tool_call_event(
                    app,
                    request_id,
                    config,
                    started_at_epoch_ms,
                    DesktopAiToolCallPayload {
                        tool_call_id,
                        tool_name: "fetchWebPage".into(),
                        state: DesktopAiToolCallState::OutputError,
                        input: Some(tool_input),
                        output: None,
                        error_text: Some(error.clone()),
                    },
                );
                eprintln!("Failed to fetch webpage context through Exa: {error}");
                prompt.to_string()
            }
        };
    }

    if !should_search_web(prompt_without_resume_context) {
        return prompt.to_string();
    }

    let tool_call_id = format!("{request_id}-search-web");
    let tool_input = json!({
        "query": prompt_without_resume_context.trim(),
        "numResults": MAX_SEARCH_RESULTS,
        "searchType": "auto",
        "includeText": true,
    });
    emit_tool_call_event(
        app,
        request_id,
        config,
        started_at_epoch_ms,
        DesktopAiToolCallPayload {
            tool_call_id: tool_call_id.clone(),
            tool_name: "searchWeb".into(),
            state: DesktopAiToolCallState::InputStreaming,
            input: Some(tool_input.clone()),
            output: None,
            error_text: None,
        },
    );

    match search_web_context(client, &exa_config, prompt_without_resume_context.trim()).await {
        Ok(outcome) => {
            emit_tool_call_event(
                app,
                request_id,
                config,
                started_at_epoch_ms,
                DesktopAiToolCallPayload {
                    tool_call_id,
                    tool_name: "searchWeb".into(),
                    state: DesktopAiToolCallState::OutputAvailable,
                    input: Some(tool_input),
                    output: Some(outcome.tool_output.clone()),
                    error_text: None,
                },
            );

            if let Some(search_context) = outcome.prompt_context {
                format!(
                    "{prompt}\n\nSearch results via Exa:\n{search_context}\n\nUse the search results above to answer the user's request. Cite the relevant URLs you relied on. Do not say you cannot browse when search results are included."
                )
            } else {
                prompt.to_string()
            }
        }
        Err(error) => {
            emit_tool_call_event(
                app,
                request_id,
                config,
                started_at_epoch_ms,
                DesktopAiToolCallPayload {
                    tool_call_id,
                    tool_name: "searchWeb".into(),
                    state: DesktopAiToolCallState::OutputError,
                    input: Some(tool_input),
                    output: None,
                    error_text: Some(error.clone()),
                },
            );
            eprintln!("Failed to search web context through Exa: {error}");
            prompt.to_string()
        }
    }
}

fn resolve_exa_config(
    workspace_root: &std::path::Path,
) -> Result<Option<ResolvedExaConfig>, String> {
    let settings_document = settings::load_or_initialize_settings(workspace_root)?;
    let base_url = settings_document.ai.exa_pool_base_url.trim().to_string();
    let base_url = if base_url.is_empty() {
        DEFAULT_EXA_BASE_URL.to_string()
    } else {
        base_url
    };

    let api_key = settings::read_secret_value(workspace_root, "provider.exa_pool.api_key")?
        .unwrap_or_default()
        .trim()
        .to_string();

    if api_key.is_empty() {
        return Ok(None);
    }

    Ok(Some(ResolvedExaConfig { base_url, api_key }))
}

fn extract_urls(text: &str) -> Vec<String> {
    let mut urls = Vec::new();
    let mut cursor = 0usize;

    while cursor < text.len() {
        let remaining = &text[cursor..];
        let Some(relative_start) = find_url_start(remaining) else {
            break;
        };

        let start = cursor + relative_start;
        let candidate = extract_url_candidate(&text[start..]);
        if candidate.is_empty() {
            cursor = start.saturating_add("https://".len());
            continue;
        }

        if !urls.iter().any(|existing| existing == &candidate) {
            urls.push(candidate);
            if urls.len() >= MAX_FETCHED_WEBPAGE_COUNT {
                break;
            }
        }

        cursor = start.saturating_add(1);
    }

    urls
}

fn find_url_start(text: &str) -> Option<usize> {
    let http = text.find("http://");
    let https = text.find("https://");

    match (http, https) {
        (Some(left), Some(right)) => Some(left.min(right)),
        (Some(left), None) => Some(left),
        (None, Some(right)) => Some(right),
        (None, None) => None,
    }
}

fn extract_url_candidate(text: &str) -> String {
    let mut end = 0usize;

    for (index, character) in text.char_indices() {
        if index > 0 && is_url_terminator(character) {
            break;
        }
        end = index + character.len_utf8();
    }

    if end == 0 {
        return String::new();
    }

    trim_url_token(&text[..end])
}

fn is_url_terminator(character: char) -> bool {
    character.is_whitespace()
        || matches!(
            character,
            '"' | '\''
                | ','
                | ';'
                | '<'
                | '>'
                | '['
                | ']'
                | '{'
                | '}'
                | '|'
                | '\\'
                | '^'
                | '`'
                | '，'
                | '。'
                | '；'
                | '：'
                | '！'
                | '？'
                | '（'
                | '）'
                | '【'
                | '】'
                | '《'
                | '》'
                | '、'
        )
        || (!character.is_ascii()
            && !matches!(
                character,
                '%' | '#' | '&' | '=' | '-' | '_' | '/' | ':' | '.' | '?' | '~' | '+'
            ))
}

fn trim_url_token(token: &str) -> String {
    token
        .trim()
        .trim_matches(|character: char| {
            matches!(
                character,
                '"' | '\''
                    | ','
                    | '.'
                    | ';'
                    | ':'
                    | '!'
                    | '?'
                    | ')'
                    | ']'
                    | '}'
                    | '>'
                    | '，'
                    | '。'
                    | '；'
                    | '：'
                    | '！'
                    | '？'
                    | '）'
                    | '】'
                    | '》'
                    | '、'
            )
        })
        .to_string()
}

fn should_search_web(text: &str) -> bool {
    let normalized = text.trim().to_ascii_lowercase();
    if normalized.is_empty() {
        return false;
    }

    const SEARCH_CUES: [&str; 22] = [
        "搜索",
        "搜一下",
        "帮我搜",
        "查一下",
        "帮我查",
        "查询",
        "检索",
        "找一下",
        "帮我找",
        "最新",
        "最近",
        "官网",
        "文档",
        "教程",
        "search",
        "look up",
        "find ",
        "latest",
        "recent",
        "documentation",
        "docs",
        "tutorial",
    ];

    SEARCH_CUES.iter().any(|cue| normalized.contains(cue))
}

async fn fetch_webpage_context(
    client: &reqwest::Client,
    config: &ResolvedExaConfig,
    urls: &[String],
) -> Result<ExaToolRunOutcome, String> {
    let endpoint = format!("{}/contents", config.base_url.trim_end_matches('/'));
    let response = client
        .post(&endpoint)
        .bearer_auth(&config.api_key)
        .header("Content-Type", "application/json")
        .header("User-Agent", "jobpilot-desktop/1.0")
        .json(&json!({
            "urls": urls,
            "text": true,
        }))
        .send()
        .await
        .map_err(|error| format!("failed to call {endpoint}: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "failed to read Exa error body".into());
        return Err(format!("Exa returned {status}: {body}"));
    }

    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|error| format!("failed to parse Exa response: {error}"))?;
    let results = body
        .get("results")
        .and_then(|value| value.as_array())
        .cloned()
        .unwrap_or_default();

    let pages = results
        .iter()
        .filter_map(|item| {
            let url = item.get("url")?.as_str()?.trim();
            if url.is_empty() {
                return None;
            }

            let title = item
                .get("title")
                .and_then(|value| value.as_str())
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .unwrap_or("Untitled");
            let excerpt = item
                .get("text")
                .and_then(|value| value.as_str())
                .map(|value| truncate_text(value, MAX_FETCHED_WEBPAGE_CHARS))
                .filter(|value| !value.is_empty())
                .unwrap_or_else(|| "No page text returned.".into());

            Some(json!({
                "url": url,
                "title": title,
                "text": excerpt,
            }))
        })
        .collect::<Vec<_>>();

    let prompt_context = if pages.is_empty() {
        None
    } else {
        Some(
            pages
                .iter()
                .filter_map(|page| {
                    let url = page.get("url")?.as_str()?;
                    let title = page.get("title")?.as_str()?;
                    let excerpt = page.get("text")?.as_str()?;
                    Some(format!(
                        "URL: {url}\nTitle: {title}\nContent excerpt:\n{excerpt}"
                    ))
                })
                .collect::<Vec<_>>()
                .join("\n\n---\n\n"),
        )
    };

    Ok(ExaToolRunOutcome {
        prompt_context,
        tool_output: json!({
            "success": true,
            "resultCount": pages.len(),
            "pages": pages,
        }),
    })
}

async fn search_web_context(
    client: &reqwest::Client,
    config: &ResolvedExaConfig,
    query: &str,
) -> Result<ExaToolRunOutcome, String> {
    if query.is_empty() {
        return Ok(ExaToolRunOutcome {
            prompt_context: None,
            tool_output: json!({
                "success": true,
                "query": query,
                "searchType": "auto",
                "resultCount": 0,
                "results": [],
            }),
        });
    }

    let endpoint = format!("{}/search", config.base_url.trim_end_matches('/'));
    let response = client
        .post(&endpoint)
        .bearer_auth(&config.api_key)
        .header("Content-Type", "application/json")
        .header("User-Agent", "jobpilot-desktop/1.0")
        .json(&json!({
            "query": query,
            "numResults": MAX_SEARCH_RESULTS,
            "type": "auto",
            "contents": {
                "text": true,
            },
        }))
        .send()
        .await
        .map_err(|error| format!("failed to call {endpoint}: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "failed to read Exa error body".into());
        return Err(format!("Exa returned {status}: {body}"));
    }

    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|error| format!("failed to parse Exa response: {error}"))?;
    let results = body
        .get("results")
        .and_then(|value| value.as_array())
        .cloned()
        .unwrap_or_default();

    let search_results = results
        .iter()
        .take(MAX_SEARCH_RESULTS)
        .filter_map(|item| {
            let url = item.get("url")?.as_str()?.trim();
            if url.is_empty() {
                return None;
            }

            let title = item
                .get("title")
                .and_then(|value| value.as_str())
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .unwrap_or("Untitled");
            let published_date = item
                .get("publishedDate")
                .and_then(|value| value.as_str())
                .map(str::trim)
                .filter(|value| !value.is_empty());
            let excerpt = item
                .get("text")
                .and_then(|value| value.as_str())
                .map(|value| truncate_text(value, MAX_SEARCH_SNIPPET_CHARS))
                .filter(|value| !value.is_empty())
                .unwrap_or_else(|| "No summary returned.".into());

            let mut lines = vec![format!("URL: {url}"), format!("Title: {title}")];
            if let Some(published_date) = published_date {
                lines.push(format!("Published: {published_date}"));
            }
            lines.push(format!("Snippet:\n{excerpt}"));

            Some(json!({
                "url": url,
                "title": title,
                "publishedDate": published_date,
                "text": excerpt,
                "display": lines.join("\n"),
            }))
        })
        .collect::<Vec<_>>();

    let prompt_context = if search_results.is_empty() {
        None
    } else {
        Some(
            search_results
                .iter()
                .filter_map(|result| {
                    result
                        .get("display")
                        .and_then(|value| value.as_str())
                        .map(ToString::to_string)
                })
                .collect::<Vec<_>>()
                .join("\n\n---\n\n"),
        )
    };

    let results_for_output = search_results
        .iter()
        .map(|result| {
            json!({
                "url": result.get("url").cloned().unwrap_or(serde_json::Value::Null),
                "title": result.get("title").cloned().unwrap_or(serde_json::Value::Null),
                "publishedDate": result
                    .get("publishedDate")
                    .cloned()
                    .unwrap_or(serde_json::Value::Null),
                "text": result.get("text").cloned().unwrap_or(serde_json::Value::Null),
            })
        })
        .collect::<Vec<_>>();

    Ok(ExaToolRunOutcome {
        prompt_context,
        tool_output: json!({
            "success": true,
            "query": query,
            "searchType": "auto",
            "resultCount": results_for_output.len(),
            "results": results_for_output,
        }),
    })
}

fn truncate_text(value: &str, max_chars: usize) -> String {
    let trimmed = value.trim();
    if trimmed.chars().count() <= max_chars {
        return trimmed.to_string();
    }

    let truncated = trimmed.chars().take(max_chars).collect::<String>();
    format!("{truncated}...")
}

fn normalize_interview_locale(locale: Option<&str>) -> String {
    match locale.unwrap_or("zh").trim().to_ascii_lowercase().as_str() {
        "en" | "en-us" | "en-gb" => "en".into(),
        _ => "zh".into(),
    }
}

fn resolve_interview_round_for_turn(
    session: &storage::InterviewSessionDetail,
    requested_round_id: Option<&str>,
) -> Result<storage::InterviewRoundDetail, String> {
    if let Some(round_id) = requested_round_id
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        return session
            .rounds
            .iter()
            .find(|round| round.id == round_id)
            .cloned()
            .ok_or_else(|| format!("interview round not found: {round_id}"));
    }

    session
        .rounds
        .iter()
        .find(|round| round.sort_order == session.current_round)
        .or_else(|| {
            session
                .rounds
                .iter()
                .find(|round| matches!(round.status.as_str(), "pending" | "in_progress"))
        })
        .cloned()
        .ok_or_else(|| format!("interview session {} has no active round", session.id))
}

fn build_interview_input_message(
    kind: &InterviewTurnKind,
    message: Option<String>,
    metadata: Option<Value>,
    locale: &str,
) -> Result<(String, String, Value), String> {
    let merged_metadata = merge_metadata_objects(
        metadata,
        json!({ "turnKind": interview_turn_kind_label(kind) }),
    )?;

    match kind {
        InterviewTurnKind::Start => Ok((
            "system".into(),
            if locale == "zh" {
                "[系统指令] 开始本轮面试。请做一句自然的自我介绍，然后直接进入第一个问题。".into()
            } else {
                "[System] Start this interview round now. Give a natural one-line introduction, then move directly into the first question.".into()
            },
            merged_metadata,
        )),
        InterviewTurnKind::Answer => {
            let content = message.unwrap_or_default().trim().to_string();
            if content.is_empty() {
                return Err("message is required when kind is 'answer'".into());
            }
            Ok(("candidate".into(), content, merged_metadata))
        }
        InterviewTurnKind::Hint => {
            Ok(("system".into(), build_hint_prompt(locale), merged_metadata))
        }
        InterviewTurnKind::Skip => {
            Ok(("system".into(), build_skip_prompt(locale), merged_metadata))
        }
        InterviewTurnKind::EndRound => Ok((
            "system".into(),
            build_end_round_prompt(locale),
            merged_metadata,
        )),
    }
}

fn build_resume_context(
    app: &AppHandle,
    resume_id: Option<&str>,
) -> Result<Option<String>, String> {
    let Some(resume_id) = resume_id.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(None);
    };

    let Some(document) = storage::get_document(app, resume_id)? else {
        return Ok(None);
    };

    let mut lines = Vec::new();
    lines.push(format!("Resume Title: {}", document.title));
    for section in document.sections {
        if !section.visible {
            continue;
        }
        let content = storage_section_content_for_prompt(&section.content_json);
        if content.is_empty() {
            continue;
        }
        lines.push(format!("## {}", section.title));
        lines.push(content);
    }

    let joined = lines.join("\n\n").trim().to_string();
    if joined.is_empty() {
        Ok(None)
    } else {
        Ok(Some(joined))
    }
}

fn storage_section_content_for_prompt(content_json: &str) -> String {
    let value = serde_json::from_str::<Value>(content_json).unwrap_or_else(|_| json!(content_json));
    match value {
        Value::String(text) => text.trim().to_string(),
        other => serde_json::to_string_pretty(&other).unwrap_or_default(),
    }
}

fn build_interview_messages(
    session: &storage::InterviewSessionDetail,
    round: &storage::InterviewRoundDetail,
    resume_context: Option<String>,
    locale: &str,
) -> Vec<Value> {
    let mut messages = Vec::new();
    messages.push(json!({
        "role": "system",
        "content": build_interview_system_prompt(
            &round.interviewer_config,
            &session.job_description,
            resume_context.as_deref(),
            round.max_questions,
            locale,
        ),
    }));

    for message in &round.messages {
        let role = match message.role.as_str() {
            "interviewer" => "assistant",
            "candidate" => "user",
            "system" => "system",
            _ => continue,
        };
        messages.push(json!({
            "role": role,
            "content": message.content,
        }));
    }

    messages
}

fn split_anthropic_system_prompt(messages: &[Value]) -> (Option<String>, Vec<Value>) {
    let mut system_parts = Vec::new();
    let mut anthropic_messages = Vec::new();

    for message in messages {
        let role = message
            .get("role")
            .and_then(|value| value.as_str())
            .unwrap_or_default();
        let content = message
            .get("content")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .trim();
        if content.is_empty() {
            continue;
        }

        match role {
            "system" => {
                if system_parts.is_empty() {
                    system_parts.push(content.to_string());
                } else {
                    anthropic_messages.push(json!({
                        "role": "user",
                        "content": content,
                    }));
                }
            }
            "assistant" => anthropic_messages.push(json!({
                "role": "assistant",
                "content": content,
            })),
            _ => anthropic_messages.push(json!({
                "role": "user",
                "content": content,
            })),
        }
    }

    let system_prompt = if system_parts.is_empty() {
        None
    } else {
        Some(system_parts.join("\n\n"))
    };

    (system_prompt, anthropic_messages)
}

fn build_interview_system_prompt(
    interviewer_config: &Value,
    job_description: &str,
    resume_content: Option<&str>,
    max_questions: i32,
    locale: &str,
) -> String {
    let interviewer_name = interviewer_display_name(interviewer_config);
    let interviewer_title = interviewer_config
        .get("title")
        .and_then(|value| value.as_str())
        .unwrap_or(if locale == "zh" {
            "面试官"
        } else {
            "Interviewer"
        });
    let bio = interviewer_config
        .get("bio")
        .and_then(|value| value.as_str())
        .unwrap_or("");
    let personality = interviewer_config
        .get("personality")
        .and_then(|value| value.as_str())
        .unwrap_or("");
    let style = interviewer_config
        .get("style")
        .and_then(|value| value.as_str())
        .unwrap_or("");
    let focus_areas = interviewer_config
        .get("focusAreas")
        .and_then(|value| value.as_array())
        .map(|values| {
            values
                .iter()
                .filter_map(|value| value.as_str())
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let focus_line = if focus_areas.is_empty() {
        if locale == "zh" {
            "综合评估候选人与岗位的匹配度".to_string()
        } else {
            "Assess the candidate holistically against the role.".to_string()
        }
    } else if locale == "zh" {
        focus_areas.join("、")
    } else {
        focus_areas.join(", ")
    };

    if locale == "zh" {
        format!(
            "# 角色设定\n\n你是{}，{}。\n\n## 个人背景\n{}\n\n## 性格特征\n{}\n\n## 提问风格\n{}\n\n---\n\n# 面试上下文\n\n## 本轮考察重点\n{}\n\n## 招聘岗位 JD\n{}\n\n## 候选人简历\n{}\n\n---\n\n# 面试执行规范\n\n- 每次只提出一个问题，等待候选人完整作答后再回应。\n- 先对候选人的回答做出简短反应，再继续追问或切换到下一个问题。\n- 本轮总共约 {} 个主题问题，节奏自然，不赶不拖。\n- 说话像一个真实、资深的面试官，不要像 AI 助手。\n- 当问题差不多结束时，给出一段简短、真实的本轮评价，并在最后单独一行写 [ROUND_COMPLETE]。\n- 不使用 emoji，不使用模板化寒暄，不质疑候选人提到的新技术是否存在。\n\n用中文交流。",
            interviewer_name,
            interviewer_title,
            bio,
            personality,
            style,
            focus_line,
            job_description,
            resume_content.unwrap_or("候选人未提供简历，请根据岗位要求展开面试。"),
            max_questions
        )
    } else {
        format!(
            "# Role\n\nYou are {}, {}.\n\n## Background\n{}\n\n## Personality\n{}\n\n## Interviewing Style\n{}\n\n---\n\n# Interview Context\n\n## Focus Areas\n{}\n\n## Job Description\n{}\n\n## Candidate Resume\n{}\n\n---\n\n# Interview Conduct Guidelines\n\n- Ask one question at a time and wait for the candidate to finish.\n- Briefly react to each answer before following up or moving on.\n- Cover about {} topic questions this round at a natural pace.\n- Speak like an experienced human interviewer, not an AI assistant.\n- When the round is genuinely wrapping up, give a short, honest assessment and end with [ROUND_COMPLETE] on its own line.\n- Avoid emoji, avoid canned pleasantries, and never question whether a new technology mentioned by the candidate really exists.\n\nConduct the interview in English.",
            interviewer_name,
            interviewer_title,
            bio,
            personality,
            style,
            focus_line,
            job_description,
            resume_content.unwrap_or("No resume was provided. Assess the candidate against the role requirements directly."),
            max_questions
        )
    }
}

fn interviewer_display_name(interviewer_config: &Value) -> String {
    interviewer_config
        .get("name")
        .and_then(|value| value.as_str())
        .map(ToString::to_string)
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| "Interviewer".into())
}

fn build_hint_prompt(locale: &str) -> String {
    if locale == "zh" {
        "[系统指令] 候选人请求引导。请用你的风格给出适度的方向性提示，点到为止，不要直接给完整答案。提示后把问题交还给候选人继续作答。".into()
    } else {
        "[System] The candidate is asking for guidance. Give a directional hint in your own style, but do not provide the full answer. After the hint, hand the question back to the candidate.".into()
    }
}

fn build_skip_prompt(locale: &str) -> String {
    if locale == "zh" {
        "[系统指令] 候选人选择跳过当前问题。记下这个信号，然后自然地切换到下一个话题继续面试，不要刻意放大“跳过”这件事。".into()
    } else {
        "[System] The candidate chose to skip this question. Note it internally, then transition naturally to the next topic without dwelling on the skip.".into()
    }
}

fn build_end_round_prompt(locale: &str) -> String {
    if locale == "zh" {
        "[系统指令] 候选人请求结束本轮面试。请给出简短的本轮总结评价，然后在最后单独一行写 [ROUND_COMPLETE]。".into()
    } else {
        "[System] The candidate wants to conclude this round. Give a brief round summary, then end with [ROUND_COMPLETE] on its own line.".into()
    }
}

fn interview_turn_kind_label(kind: &InterviewTurnKind) -> &'static str {
    match kind {
        InterviewTurnKind::Start => "start",
        InterviewTurnKind::Answer => "answer",
        InterviewTurnKind::Hint => "hint",
        InterviewTurnKind::Skip => "skip",
        InterviewTurnKind::EndRound => "end_round",
    }
}

fn should_increment_interview_question_count(kind: &InterviewTurnKind) -> bool {
    matches!(
        kind,
        InterviewTurnKind::Start | InterviewTurnKind::Answer | InterviewTurnKind::Skip
    )
}

fn sanitize_interview_response(text: &str) -> String {
    text.replace("[ROUND_COMPLETE]", "").trim().to_string()
}

fn extract_round_summary(text: &str) -> Option<String> {
    let cleaned = sanitize_interview_response(text);
    if cleaned.is_empty() {
        None
    } else {
        Some(cleaned)
    }
}

fn merge_metadata_objects(base: Option<Value>, extra: Value) -> Result<Value, String> {
    let mut merged = match base {
        Some(Value::Object(map)) => map,
        Some(_) => return Err("interview metadata must be a JSON object when provided".into()),
        None => serde_json::Map::new(),
    };

    let Some(extra_map) = extra.as_object() else {
        return Err("internal interview metadata patch must be a JSON object".into());
    };
    for (key, value) in extra_map {
        merged.insert(key.clone(), value.clone());
    }
    Ok(Value::Object(merged))
}

fn build_interview_report_system_prompt(locale: &str) -> String {
    if locale == "zh" {
        "你是一位专业的人才评估与面试训练教练。你会根据面试记录产出可信、结构化、可执行的 JSON 复盘报告，只输出合法 JSON，不要附加解释。".into()
    } else {
        "You are an experienced talent assessment and interview practice coach. Produce a credible, structured, actionable JSON report from interview transcripts. Return valid JSON only.".into()
    }
}

fn build_interview_answer_evaluation_system_prompt(locale: &str) -> String {
    if locale == "zh" {
        "你是一位严谨的面试回答教练。你只评估候选人刚刚这一次回答，并输出合法 JSON。不要安慰式泛泛评价，不要虚构候选人没说过的细节。".into()
    } else {
        "You are a rigorous interview answer coach. Evaluate only the candidate's latest answer and return valid JSON. Avoid vague encouragement and do not invent details the candidate did not provide.".into()
    }
}

fn build_interview_answer_evaluation_user_prompt(
    session: &storage::InterviewSessionDetail,
    round: &storage::InterviewRoundDetail,
    candidate_message: &storage::InterviewMessageItem,
    interviewer_response: &str,
    locale: &str,
) -> String {
    let previous_question = round
        .messages
        .iter()
        .rev()
        .filter(|message| message.role == "interviewer")
        .find(|message| message.created_at_epoch_ms <= candidate_message.created_at_epoch_ms)
        .map(|message| message.content.as_str())
        .unwrap_or("");
    let focus_areas = round
        .interviewer_config
        .get("focusAreas")
        .and_then(|value| value.as_array())
        .map(|values| {
            values
                .iter()
                .filter_map(|value| value.as_str())
                .collect::<Vec<_>>()
                .join(", ")
        })
        .unwrap_or_default();
    let job_title = session.job_title.clone().unwrap_or_default();

    if locale == "zh" {
        format!(
            "请评估候选人刚刚这一次回答。\n\n输出 JSON，字段且仅字段如下：\n{{\n  \"overallScore\": <0-100 整数>,\n  \"summary\": <1-2 句简短评价>,\n  \"dimensions\": [\n    {{ \"id\": \"structure\", \"label\": \"结构完整度\", \"score\": <0-100>, \"feedback\": <一句话> }},\n    {{ \"id\": \"contribution\", \"label\": \"个人贡献\", \"score\": <0-100>, \"feedback\": <一句话> }},\n    {{ \"id\": \"quantification\", \"label\": \"结果量化\", \"score\": <0-100>, \"feedback\": <一句话> }},\n    {{ \"id\": \"jdRelevance\", \"label\": \"岗位相关性\", \"score\": <0-100>, \"feedback\": <一句话> }},\n    {{ \"id\": \"clarity\", \"label\": \"表达清晰度\", \"score\": <0-100>, \"feedback\": <一句话> }}\n  ],\n  \"strengths\": [<字符串>, ...],\n  \"riskPoints\": [<字符串>, ...],\n  \"followUpQuestion\": <建议面试官继续追问的一个具体问题，若无则 null>,\n  \"trainingSuggestions\": [<候选人下一次可练习的具体动作>, ...]\n}}\n\n要求：\n- 如果是行为/项目回答，按 STAR 关注背景、任务、行动、结果是否完整。\n- 如果是技术回答，关注原理、权衡、边界、排障和落地指标。\n- `riskPoints` 指出面试官可能质疑的点。\n- `followUpQuestion` 必须基于这次回答的缺口，不要泛泛而谈。\n- 只基于下面内容判断。\n\n岗位标题：{}\n岗位 JD：\n{}\n\n本轮面试官：{} / {}\n本轮重点：{}\n\n上一道问题：\n{}\n\n候选人回答：\n{}\n\n面试官随后回应：\n{}",
            job_title,
            session.job_description,
            interviewer_display_name(&round.interviewer_config),
            round.interviewer_type,
            focus_areas,
            previous_question,
            candidate_message.content,
            interviewer_response
        )
    } else {
        format!(
            "Evaluate only the candidate's latest answer.\n\nReturn JSON with exactly these fields:\n{{\n  \"overallScore\": <integer 0-100>,\n  \"summary\": <1-2 sentence concise assessment>,\n  \"dimensions\": [\n    {{ \"id\": \"structure\", \"label\": \"Structure\", \"score\": <0-100>, \"feedback\": <one sentence> }},\n    {{ \"id\": \"contribution\", \"label\": \"Personal contribution\", \"score\": <0-100>, \"feedback\": <one sentence> }},\n    {{ \"id\": \"quantification\", \"label\": \"Quantified result\", \"score\": <0-100>, \"feedback\": <one sentence> }},\n    {{ \"id\": \"jdRelevance\", \"label\": \"JD relevance\", \"score\": <0-100>, \"feedback\": <one sentence> }},\n    {{ \"id\": \"clarity\", \"label\": \"Clarity\", \"score\": <0-100>, \"feedback\": <one sentence> }}\n  ],\n  \"strengths\": [<string>, ...],\n  \"riskPoints\": [<string>, ...],\n  \"followUpQuestion\": <one concrete follow-up question the interviewer should ask, or null>,\n  \"trainingSuggestions\": [<specific practice action>, ...]\n}}\n\nRequirements:\n- For behavioral/project answers, use STAR: situation, task, action, result.\n- For technical answers, assess principles, trade-offs, boundaries, debugging, and measurable outcomes.\n- `riskPoints` should identify what an interviewer may challenge.\n- `followUpQuestion` must target a real gap in this answer.\n- Base the assessment only on the supplied content.\n\nJob title: {}\nJob description:\n{}\n\nInterviewer: {} / {}\nRound focus: {}\n\nPrevious question:\n{}\n\nCandidate answer:\n{}\n\nInterviewer response after the answer:\n{}",
            job_title,
            session.job_description,
            interviewer_display_name(&round.interviewer_config),
            round.interviewer_type,
            focus_areas,
            previous_question,
            candidate_message.content,
            interviewer_response
        )
    }
}

fn build_interview_report_user_prompt(
    session: &storage::InterviewSessionDetail,
    locale: &str,
) -> String {
    let transcript = session
        .rounds
        .iter()
        .map(|round| {
            json!({
                "roundId": round.id,
                "interviewerType": round.interviewer_type,
                "interviewerName": interviewer_display_name(&round.interviewer_config),
                "status": round.status,
                "questionCount": round.question_count,
                "messages": round.messages.iter().map(|message| {
                    json!({
                        "role": message.role,
                        "content": message.content,
                        "metadata": message.metadata,
                    })
                }).collect::<Vec<_>>(),
            })
        })
        .collect::<Vec<_>>();
    let transcript_json = serde_json::to_string_pretty(&transcript).unwrap_or_else(|_| "[]".into());
    let job_title = session.job_title.clone().unwrap_or_default();

    if locale == "zh" {
        format!(
            "请基于下面的桌面端面试记录生成一份面试训练复盘报告。\n\n输出 JSON，字段且仅字段如下：\n{{\n  \"overallScore\": <0-100 整数>,\n  \"summary\": <2-4 句总结>,\n  \"overallFeedback\": <2-5 句整体反馈>,\n  \"improvementSuggestions\": [<字符串>, ...],\n  \"weakPoints\": [\n    {{ \"title\": <薄弱点标题>, \"evidence\": <来自面试记录的证据>, \"severity\": \"low\" | \"medium\" | \"high\", \"trainingFocus\": <训练重点> }}\n  ],\n  \"trainingPlan\": [\n    {{ \"title\": <训练项标题>, \"description\": <训练目标>, \"priority\": \"low\" | \"medium\" | \"high\", \"drills\": [<具体练习动作>, ...] }}\n  ]\n}}\n\n要求：\n- 只基于给定记录做判断，不要虚构没有发生的细节。\n- `improvementSuggestions` 返回 3-6 条可执行建议。\n- `weakPoints` 返回 2-5 条，必须包含证据和训练重点。\n- `trainingPlan` 返回 2-4 个训练项，每个训练项包含 2-4 个 drills。\n- 如果轮次不完整，也要如实反映在反馈里。\n\n岗位标题：{}\n岗位 JD：\n{}\n\n面试记录：\n{}",
            job_title,
            session.job_description,
            transcript_json
        )
    } else {
        format!(
            "Generate an interview practice report from the following desktop interview transcript.\n\nReturn JSON with exactly these fields:\n{{\n  \"overallScore\": <integer 0-100>,\n  \"summary\": <2-4 sentence summary>,\n  \"overallFeedback\": <2-5 sentence overall feedback>,\n  \"improvementSuggestions\": [<string>, ...],\n  \"weakPoints\": [\n    {{ \"title\": <weak point title>, \"evidence\": <evidence from the transcript>, \"severity\": \"low\" | \"medium\" | \"high\", \"trainingFocus\": <training focus> }}\n  ],\n  \"trainingPlan\": [\n    {{ \"title\": <training item title>, \"description\": <training goal>, \"priority\": \"low\" | \"medium\" | \"high\", \"drills\": [<specific practice action>, ...] }}\n  ]\n}}\n\nRequirements:\n- Base the assessment only on the supplied transcript.\n- Return 3-6 actionable `improvementSuggestions` entries.\n- Return 2-5 `weakPoints`, each with evidence and training focus.\n- Return 2-4 `trainingPlan` items, each with 2-4 drills.\n- If the session is incomplete, say so honestly in the feedback.\n\nJob title: {}\nJob description:\n{}\n\nTranscript:\n{}",
            job_title,
            session.job_description,
            transcript_json
        )
    }
}

fn clean_string_list(values: Vec<String>) -> Vec<String> {
    values
        .into_iter()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .collect()
}

fn normalize_priority_or_severity(value: &str) -> String {
    match value.trim() {
        "low" | "medium" | "high" => value.trim().to_string(),
        _ => "medium".into(),
    }
}

async fn request_openai_json_completion(
    client: &reqwest::Client,
    endpoint: &str,
    config: &ResolvedProviderConfig,
    system_prompt: &str,
    user_prompt: &str,
) -> Result<Value, String> {
    let response = client
        .post(endpoint)
        .bearer_auth(&config.api_key)
        .header("Content-Type", "application/json")
        .json(&json!({
            "model": config.model,
            "messages": [
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": user_prompt }
            ],
            "temperature": 0.3,
            "response_format": { "type": "json_object" }
        }))
        .send()
        .await
        .map_err(|error| format!("failed to call {endpoint}: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "failed to read upstream error body".into());
        return Err(format!("provider returned {status}: {body}"));
    }

    let body: Value = response
        .json()
        .await
        .map_err(|error| format!("failed to parse provider JSON response: {error}"))?;
    let content = extract_openai_completion_text(&body)
        .ok_or_else(|| "provider completion response did not contain text content".to_string())?;
    parse_json_value_from_text(&content)
}

fn extract_openai_completion_text(body: &Value) -> Option<String> {
    let choice = body.get("choices")?.as_array()?.first()?;
    let message = choice.get("message")?;
    let content = message.get("content")?;

    if let Some(text) = content.as_str() {
        return Some(text.to_string());
    }

    let mut aggregated = String::new();
    for item in content.as_array()? {
        if let Some(text) = item.get("text").and_then(|value| value.as_str()) {
            aggregated.push_str(text);
        }
    }

    if aggregated.is_empty() {
        None
    } else {
        Some(aggregated)
    }
}

async fn request_anthropic_json_completion(
    client: &reqwest::Client,
    endpoint: &str,
    config: &ResolvedProviderConfig,
    system_prompt: &str,
    user_prompt: &str,
) -> Result<Value, String> {
    let response = client
        .post(endpoint)
        .header("x-api-key", &config.api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&json!({
            "model": config.model,
            "max_tokens": 4096,
            "system": system_prompt,
            "messages": [
                { "role": "user", "content": user_prompt }
            ]
        }))
        .send()
        .await
        .map_err(|error| format!("failed to call Anthropic {endpoint}: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "failed to read upstream error body".into());
        return Err(format!("Anthropic returned {status}: {body}"));
    }

    let body: Value = response
        .json()
        .await
        .map_err(|error| format!("failed to parse Anthropic JSON response: {error}"))?;
    let text = body
        .get("content")
        .and_then(|c| c.as_array())
        .and_then(|arr| {
            arr.iter()
                .find(|block| block.get("type").and_then(|t| t.as_str()) == Some("text"))
        })
        .and_then(|block| block.get("text"))
        .and_then(|t| t.as_str())
        .ok_or_else(|| "Anthropic response missing text content".to_string())?;
    parse_json_value_from_text(text)
}

fn parse_json_value_from_text(content: &str) -> Result<Value, String> {
    let trimmed = content.trim();
    if let Ok(value) = serde_json::from_str::<Value>(trimmed) {
        return Ok(value);
    }

    let without_fence = trimmed
        .strip_prefix("```json")
        .or_else(|| trimmed.strip_prefix("```"))
        .map(|value| value.trim())
        .unwrap_or(trimmed);
    let without_fence = without_fence
        .strip_suffix("```")
        .map(|value| value.trim())
        .unwrap_or(without_fence);
    if let Ok(value) = serde_json::from_str::<Value>(without_fence) {
        return Ok(value);
    }

    let start = trimmed
        .find('{')
        .ok_or_else(|| "response did not contain a JSON object".to_string())?;
    let end = trimmed
        .rfind('}')
        .ok_or_else(|| "response did not contain a closing JSON object".to_string())?;
    serde_json::from_str::<Value>(&trimmed[start..=end])
        .map_err(|error| format!("failed to parse JSON object from completion text: {error}"))
}

fn emit_stream_event(app: &AppHandle, payload: DesktopAiStreamEvent) -> Result<(), String> {
    app.emit(AI_STREAM_EVENT_NAME, payload)
        .map_err(|error| format!("failed to emit AI stream event: {error}"))
}

fn emit_empty_stream_completion(
    app: &AppHandle,
    request_id: &str,
    config: &ResolvedProviderConfig,
    started_at_epoch_ms: u64,
) -> Result<(), String> {
    emit_stream_event(
        app,
        DesktopAiStreamEvent {
            request_id: request_id.to_string(),
            provider: config.provider.clone(),
            model: config.model.clone(),
            kind: DesktopAiStreamEventKind::Started,
            started_at_epoch_ms,
            emitted_at_epoch_ms: now_epoch_ms()?,
            finished_at_epoch_ms: None,
            chunk_index: Some(0),
            delta_text: None,
            accumulated_text: Some(String::new()),
            accumulated_thinking: None,
            error_message: None,
            tool_call: None,
        },
    )?;
    emit_stream_event(
        app,
        DesktopAiStreamEvent {
            request_id: request_id.to_string(),
            provider: config.provider.clone(),
            model: config.model.clone(),
            kind: DesktopAiStreamEventKind::Completed,
            started_at_epoch_ms,
            emitted_at_epoch_ms: now_epoch_ms()?,
            finished_at_epoch_ms: Some(now_epoch_ms()?),
            chunk_index: Some(0),
            delta_text: None,
            accumulated_text: Some(String::new()),
            accumulated_thinking: Some(String::new()),
            error_message: None,
            tool_call: None,
        },
    )
}

fn emit_tool_call_event(
    app: &AppHandle,
    request_id: &str,
    config: &ResolvedProviderConfig,
    started_at_epoch_ms: u64,
    tool_call: DesktopAiToolCallPayload,
) {
    let _ = emit_stream_event(
        app,
        DesktopAiStreamEvent {
            request_id: request_id.to_string(),
            provider: config.provider.clone(),
            model: config.model.clone(),
            kind: DesktopAiStreamEventKind::Tool,
            started_at_epoch_ms,
            emitted_at_epoch_ms: now_epoch_ms().unwrap_or(started_at_epoch_ms),
            finished_at_epoch_ms: None,
            chunk_index: None,
            delta_text: None,
            accumulated_text: None,
            accumulated_thinking: None,
            error_message: None,
            tool_call: Some(tool_call),
        },
    );
}

fn extract_sse_data_payload(event_payload: &str) -> Option<String> {
    let mut data_lines = Vec::new();
    for line in event_payload.lines() {
        if let Some(content) = line.strip_prefix("data:") {
            data_lines.push(content.trim_start().to_string());
        }
    }

    if data_lines.is_empty() {
        None
    } else {
        Some(data_lines.join("\n"))
    }
}

fn extract_openai_delta_text(data_payload: &str) -> Option<String> {
    let payload = serde_json::from_str::<serde_json::Value>(data_payload).ok()?;
    let choice = payload.get("choices")?.as_array()?.first()?;
    let content = choice.get("delta")?.get("content")?;

    if let Some(text) = content.as_str() {
        return Some(text.to_string());
    }

    let mut aggregated = String::new();
    for item in content.as_array()? {
        if let Some(text) = item.get("text").and_then(|value| value.as_str()) {
            aggregated.push_str(text);
        }
    }

    if aggregated.is_empty() {
        None
    } else {
        Some(aggregated)
    }
}

fn extract_openai_reasoning_content(data_payload: &str) -> Option<String> {
    let payload = serde_json::from_str::<serde_json::Value>(data_payload).ok()?;
    let choice = payload.get("choices")?.as_array()?.first()?;
    let content = choice.get("delta")?.get("reasoning_content")?;
    content.as_str().map(ToString::to_string)
}

fn extract_anthropic_sse_event(event_payload: &str) -> Option<(String, String)> {
    let mut event_type = String::new();
    let mut data_lines = Vec::new();

    for line in event_payload.lines() {
        if let Some(content) = line.strip_prefix("event:") {
            event_type = content.trim().to_string();
        } else if let Some(content) = line.strip_prefix("data:") {
            data_lines.push(content.trim_start().to_string());
        }
    }

    if data_lines.is_empty() {
        return None;
    }

    Some((event_type, data_lines.join("\n")))
}

#[derive(Debug, Clone)]
enum AnthropicContentBlock {
    Thinking(String),
    Text(String),
    ToolUse {
        id: String,
        name: String,
        input_json: String,
    },
}

#[derive(Debug, Clone, Default)]
struct AnthropicStreamingState {
    blocks: BTreeMap<usize, AnthropicContentBlock>,
}

impl AnthropicStreamingState {
    fn finalize_tool_calls(&self) -> Result<Vec<CompletedToolCall>, String> {
        self.blocks
            .values()
            .filter_map(|block| {
                let AnthropicContentBlock::ToolUse {
                    id,
                    name,
                    input_json,
                } = block
                else {
                    return None;
                };

                let arguments = if input_json.trim().is_empty() {
                    Ok(json!({}))
                } else {
                    serde_json::from_str::<serde_json::Value>(input_json).map_err(|error| {
                        format!("failed to parse Anthropic tool input for {name}: {error}")
                    })
                };

                Some(arguments.map(|arguments| CompletedToolCall {
                    id: id.clone(),
                    name: name.clone(),
                    arguments,
                }))
            })
            .collect()
    }
}

/// Returns (delta_text, delta_thinking)
fn handle_anthropic_sse_event(
    event_type: &str,
    data_payload: &str,
    state: &mut AnthropicStreamingState,
) -> Result<(Option<String>, Option<String>), String> {
    let value: serde_json::Value = serde_json::from_str(data_payload)
        .map_err(|e| format!("failed to parse Anthropic SSE data: {e}"))?;

    match event_type {
        "content_block_start" => {
            let index = value.get("index").and_then(|v| v.as_u64()).unwrap_or(0) as usize;
            let block_type = value
                .get("content_block")
                .and_then(|b| b.get("type"))
                .and_then(|t| t.as_str())
                .unwrap_or("text");
            let block = match block_type {
                "thinking" => AnthropicContentBlock::Thinking(String::new()),
                "tool_use" => {
                    let content_block = value.get("content_block");
                    let id = content_block
                        .and_then(|block| block.get("id"))
                        .and_then(|tool_id| tool_id.as_str())
                        .unwrap_or("")
                        .to_string();
                    let name = content_block
                        .and_then(|block| block.get("name"))
                        .and_then(|tool_name| tool_name.as_str())
                        .unwrap_or("")
                        .to_string();
                    let input_json = content_block
                        .and_then(|block| block.get("input"))
                        .filter(|input| !input.is_null())
                        .map(|input| input.to_string())
                        .filter(|input| input != "{}")
                        .unwrap_or_default();

                    AnthropicContentBlock::ToolUse {
                        id,
                        name,
                        input_json,
                    }
                }
                _ => AnthropicContentBlock::Text(String::new()),
            };
            state.blocks.insert(index, block);
            Ok((None, None))
        }
        "content_block_delta" => {
            let index = value.get("index").and_then(|v| v.as_u64()).unwrap_or(0) as usize;
            let delta = value.get("delta");
            let delta_type = delta
                .and_then(|d| d.get("type"))
                .and_then(|t| t.as_str())
                .unwrap_or("");

            match delta_type {
                "thinking_delta" => {
                    let thinking = delta
                        .and_then(|d| d.get("thinking"))
                        .and_then(|t| t.as_str())
                        .unwrap_or("");
                    if let Some(AnthropicContentBlock::Thinking(ref mut acc)) =
                        state.blocks.get_mut(&index)
                    {
                        acc.push_str(thinking);
                    }
                    Ok((None, Some(thinking.to_string())))
                }
                "text_delta" => {
                    let text = delta
                        .and_then(|d| d.get("text"))
                        .and_then(|t| t.as_str())
                        .unwrap_or("");
                    if let Some(AnthropicContentBlock::Text(ref mut acc)) =
                        state.blocks.get_mut(&index)
                    {
                        acc.push_str(text);
                    }
                    Ok((Some(text.to_string()), None))
                }
                "input_json_delta" => {
                    let partial_json = delta
                        .and_then(|d| d.get("partial_json"))
                        .and_then(|partial| partial.as_str())
                        .unwrap_or("");
                    if let Some(AnthropicContentBlock::ToolUse {
                        ref mut input_json, ..
                    }) = state.blocks.get_mut(&index)
                    {
                        input_json.push_str(partial_json);
                    }
                    Ok((None, None))
                }
                _ => Ok((None, None)),
            }
        }
        "message_stop" | "message_start" | "content_block_stop" | "message_delta" => {
            Ok((None, None))
        }
        _ => Ok((None, None)),
    }
}

fn normalize_supported_provider(provider: &str) -> Option<String> {
    match provider.trim().to_ascii_lowercase().as_str() {
        "openai" | "anthropic" | "gemini" => Some(provider.trim().to_ascii_lowercase()),
        _ => None,
    }
}

fn default_base_url_for_provider(provider: &str) -> &'static str {
    match provider {
        "anthropic" => "https://api.anthropic.com",
        "gemini" => "https://generativelanguage.googleapis.com/v1beta",
        _ => "https://api.openai.com/v1",
    }
}

fn default_model_for_provider(provider: &str) -> &'static str {
    match provider {
        "anthropic" => "claude-sonnet-4-20250514",
        "gemini" => "gemini-2.0-flash",
        _ => "gpt-4o",
    }
}

fn now_epoch_ms() -> Result<u64, String> {
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("clock drift detected: {error}"))?;
    Ok(duration.as_millis() as u64)
}

fn find_sse_boundary(buffer: &[u8]) -> Option<usize> {
    let mut index = 0usize;
    while index + 1 < buffer.len() {
        if buffer[index] == b'\n' && buffer[index + 1] == b'\n' {
            return Some(index + 2);
        }

        if index + 3 < buffer.len()
            && buffer[index] == b'\r'
            && buffer[index + 1] == b'\n'
            && buffer[index + 2] == b'\r'
            && buffer[index + 3] == b'\n'
        {
            return Some(index + 4);
        }

        index += 1;
    }

    None
}

fn trim_event_terminator(mut event_bytes: Vec<u8>) -> Vec<u8> {
    while matches!(event_bytes.last(), Some(b'\n' | b'\r')) {
        event_bytes.pop();
    }
    event_bytes
}

// ---------------------------------------------------------------------------
// Fetch AI Models
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FetchAiModelsResult {
    pub provider: String,
    pub models: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FetchAiModelsInput {
    pub provider: Option<String>,
    pub base_url: Option<String>,
    pub api_key: Option<String>,
}

pub async fn fetch_ai_models(
    workspace_root: &std::path::Path,
    input: FetchAiModelsInput,
) -> Result<FetchAiModelsResult, String> {
    let settings_document = settings::load_or_initialize_settings(workspace_root)?;
    let provider = input
        .provider
        .as_ref()
        .filter(|value| !value.trim().is_empty())
        .and_then(|value| normalize_supported_provider(value))
        .unwrap_or_else(|| settings_document.ai.default_provider.trim().to_string());

    // Use provided base_url or fall back to saved config
    let base_url = input
        .base_url
        .as_ref()
        .filter(|value| !value.trim().is_empty())
        .map(|value| value.trim().to_string())
        .unwrap_or_else(|| {
            settings_document
                .ai
                .provider_configs
                .get(&provider)
                .map(|value| value.base_url.trim().to_string())
                .filter(|value| !value.is_empty())
                .unwrap_or_else(|| default_base_url_for_provider(&provider).to_string())
        });

    // Use provided api_key or fall back to saved secret
    let api_key = input
        .api_key
        .as_ref()
        .filter(|value| !value.trim().is_empty())
        .map(|value| value.trim().to_string())
        .unwrap_or_else(|| {
            let api_key_secret_key = format!("provider.{provider}.api_key");
            settings::read_secret_value(workspace_root, &api_key_secret_key)
                .ok()
                .flatten()
                .unwrap_or_default()
                .trim()
                .to_string()
        });

    if api_key.is_empty() {
        return Ok(FetchAiModelsResult {
            provider,
            models: Vec::new(),
        });
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))?;
    let models = match provider.as_str() {
        "anthropic" => fetch_anthropic_models(&client, &base_url, &api_key).await?,
        "gemini" => fetch_gemini_models(&client, &base_url, &api_key).await?,
        _ => fetch_openai_models(&client, &base_url, &api_key).await?,
    };

    Ok(FetchAiModelsResult { provider, models })
}

async fn fetch_openai_models(
    client: &reqwest::Client,
    base_url: &str,
    api_key: &str,
) -> Result<Vec<String>, String> {
    let endpoint = format!("{}/models", base_url.trim_end_matches('/'));
    let response = client
        .get(&endpoint)
        .bearer_auth(api_key)
        .send()
        .await
        .map_err(|error| format!("failed to fetch OpenAI models: {error}"))?;

    if !response.status().is_success() {
        return Ok(Vec::new());
    }

    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|error| format!("failed to parse OpenAI models response: {error}"))?;

    let models = body
        .get("data")
        .and_then(|v| v.as_array())
        .or_else(|| body.as_array())
        .map(|array| {
            array
                .iter()
                .filter_map(|item| item.get("id").and_then(|v| v.as_str()))
                .map(ToString::to_string)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let mut models = models;
    models.sort();
    Ok(models)
}

async fn fetch_anthropic_models(
    client: &reqwest::Client,
    base_url: &str,
    api_key: &str,
) -> Result<Vec<String>, String> {
    let endpoint = format!("{}/v1/models", base_url.trim_end_matches('/'));
    let response = client
        .get(&endpoint)
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .send()
        .await
        .map_err(|error| format!("failed to fetch Anthropic models: {error}"))?;

    if !response.status().is_success() {
        return Ok(Vec::new());
    }

    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|error| format!("failed to parse Anthropic models response: {error}"))?;

    let models = body
        .get("data")
        .and_then(|value| value.as_array())
        .map(|array| {
            array
                .iter()
                .filter_map(|item| item.get("id").and_then(|value| value.as_str()))
                .map(ToString::to_string)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let mut models = models;
    models.sort();
    Ok(models)
}

async fn fetch_gemini_models(
    client: &reqwest::Client,
    base_url: &str,
    api_key: &str,
) -> Result<Vec<String>, String> {
    let endpoint = format!("{}/models?key={}", base_url.trim_end_matches('/'), api_key);
    let response = client
        .get(&endpoint)
        .send()
        .await
        .map_err(|error| format!("failed to fetch Gemini models: {error}"))?;

    if !response.status().is_success() {
        return Ok(Vec::new());
    }

    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|error| format!("failed to parse Gemini models response: {error}"))?;

    let models = body
        .get("models")
        .and_then(|value| value.as_array())
        .map(|array| {
            array
                .iter()
                .filter_map(|item| item.get("name").and_then(|value| value.as_str()))
                .map(|name| name.strip_prefix("models/").unwrap_or(name).to_string())
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let mut models = models;
    models.sort();
    Ok(models)
}

// ---------------------------------------------------------------------------
// Test AI Connectivity
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectivityTestResult {
    pub success: bool,
    pub latency_ms: u64,
    pub error_message: Option<String>,
}

pub async fn test_ai_connectivity(
    workspace_root: &std::path::Path,
    provider_override: Option<&str>,
) -> Result<ConnectivityTestResult, String> {
    let settings_document = settings::load_or_initialize_settings(workspace_root)?;
    let provider = provider_override
        .filter(|value| !value.trim().is_empty())
        .and_then(|value| normalize_supported_provider(value))
        .unwrap_or_else(|| settings_document.ai.default_provider.trim().to_string());

    let configured = settings_document.ai.provider_configs.get(&provider);
    let base_url = configured
        .map(|value| value.base_url.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| default_base_url_for_provider(&provider).to_string());
    let model = configured
        .map(|value| value.model.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| default_model_for_provider(&provider).to_string());

    let api_key_secret_key = format!("provider.{provider}.api_key");
    let api_key = settings::read_secret_value(workspace_root, &api_key_secret_key)?
        .unwrap_or_default()
        .trim()
        .to_string();

    if api_key.is_empty() {
        return Ok(ConnectivityTestResult {
            success: false,
            latency_ms: 0,
            error_message: Some(format!("No API key configured for provider '{provider}'.")),
        });
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))?;
    let start = Instant::now();

    let result = match provider.as_str() {
        "anthropic" => test_anthropic_connectivity(&client, &base_url, &api_key, &model).await,
        "gemini" => test_gemini_connectivity(&client, &base_url, &api_key, &model).await,
        _ => test_openai_connectivity(&client, &base_url, &api_key, &model).await,
    };

    let latency_ms = start.elapsed().as_millis() as u64;

    match result {
        Ok(()) => Ok(ConnectivityTestResult {
            success: true,
            latency_ms,
            error_message: None,
        }),
        Err(error) => Ok(ConnectivityTestResult {
            success: false,
            latency_ms,
            error_message: Some(error),
        }),
    }
}

async fn test_openai_connectivity(
    client: &reqwest::Client,
    base_url: &str,
    api_key: &str,
    model: &str,
) -> Result<(), String> {
    let endpoint = format!("{}/chat/completions", base_url.trim_end_matches('/'));
    let response = client
        .post(&endpoint)
        .bearer_auth(api_key)
        .header("Content-Type", "application/json")
        .json(&json!({
            "model": model,
            "messages": [{"role": "user", "content": "hi"}],
            "max_tokens": 1,
        }))
        .send()
        .await
        .map_err(|error| format!("connection failed: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "failed to read error body".into());
        return Err(format!("provider returned {status}: {body}"));
    }

    Ok(())
}

async fn test_anthropic_connectivity(
    client: &reqwest::Client,
    base_url: &str,
    api_key: &str,
    model: &str,
) -> Result<(), String> {
    let endpoint = format!("{}/v1/messages", base_url.trim_end_matches('/'));
    let response = client
        .post(&endpoint)
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&json!({
            "model": model,
            "messages": [{"role": "user", "content": "hi"}],
            "max_tokens": 1,
        }))
        .send()
        .await
        .map_err(|error| format!("connection failed: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "failed to read error body".into());
        return Err(format!("provider returned {status}: {body}"));
    }

    Ok(())
}

async fn test_gemini_connectivity(
    client: &reqwest::Client,
    base_url: &str,
    api_key: &str,
    model: &str,
) -> Result<(), String> {
    let endpoint = format!(
        "{}/models/{}:generateContent?key={}",
        base_url.trim_end_matches('/'),
        model,
        api_key
    );
    let response = client
        .post(&endpoint)
        .header("Content-Type", "application/json")
        .json(&json!({
            "contents": [{"parts": [{"text": "hi"}]}],
            "generationConfig": {"maxOutputTokens": 1},
        }))
        .send()
        .await
        .map_err(|error| format!("connection failed: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "failed to read error body".into());
        return Err(format!("provider returned {status}: {body}"));
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Test Exa Connectivity
// ---------------------------------------------------------------------------

pub async fn test_exa_connectivity(
    workspace_root: &std::path::Path,
) -> Result<ConnectivityTestResult, String> {
    let Some(exa_config) = resolve_exa_config(workspace_root)? else {
        return Ok(ConnectivityTestResult {
            success: false,
            latency_ms: 0,
            error_message: Some("No API key configured for Exa.".into()),
        });
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))?;
    let endpoint = format!("{}/search", exa_config.base_url.trim_end_matches('/'));
    let start = Instant::now();

    let response = client
        .post(&endpoint)
        .bearer_auth(&exa_config.api_key)
        .header("Content-Type", "application/json")
        .json(&json!({
            "query": "test",
            "numResults": 1,
        }))
        .send()
        .await
        .map_err(|error| format!("connection failed: {error}"))?;

    let latency_ms = start.elapsed().as_millis() as u64;

    if !response.status().is_success() {
        let status = response.status();
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "failed to read error body".into());
        return Ok(ConnectivityTestResult {
            success: false,
            latency_ms,
            error_message: Some(format!("Exa returned {status}: {body}")),
        });
    }

    Ok(ConnectivityTestResult {
        success: true,
        latency_ms,
        error_message: None,
    })
}

// ============================================================================
// Markdown Resume Parser
// ============================================================================

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParseMarkdownResumeInput {
    pub content: String,
    pub provider: Option<String>,
    pub model: Option<String>,
    pub base_url: Option<String>,
    pub locale: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedResumeSection {
    pub section_type: String,
    pub title: String,
    pub content: serde_json::Value,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedResumeData {
    pub title: String,
    pub template: String,
    pub language: String,
    pub sections: Vec<ParsedResumeSection>,
}

const MARKDOWN_PARSE_SYSTEM_PROMPT: &str = r#"You are a resume parser. Extract ALL information from the Markdown resume into the EXACT JSON schema below.

REQUIRED JSON SCHEMA:
{"personalInfo":{"fullName":"","jobTitle":"","age":"","gender":"","politicalStatus":"","ethnicity":"","hometown":"","maritalStatus":"","yearsOfExperience":"","educationLevel":"","email":"","phone":"","wechat":"","location":"","website":"","linkedin":"","github":""},"summary":"","workExperience":[{"company":"Company A","position":"","location":"","startDate":"YYYY-MM","endDate":"YYYY-MM or null","current":false,"description":"","highlights":["bullet 1","bullet 2"]}],"education":[{"institution":"University A","degree":"","field":"","location":"","startDate":"YYYY-MM","endDate":"YYYY-MM","gpa":"","highlights":[]}],"skills":[{"name":"category name","skills":["skill1","skill2"]}],"projects":[{"name":"Project A","description":"","technologies":[],"highlights":[]}],"certifications":[{"name":"","issuer":"","date":""}],"languages":[{"language":"","proficiency":""}]}

RULES:
- You MUST use the EXACT field names shown above (fullName, jobTitle, workExperience, etc.)
- Output compact single-line JSON. No indentation, no newlines.
- You are a JSON API. Your entire response must be a single valid JSON object starting with { and ending with }. Do NOT use markdown syntax. Do NOT wrap in code fences. Do NOT add any text before or after the JSON.
- Use YYYY-MM for dates. Empty string "" for missing fields.
- For current jobs: current=true, endDate=null.
- Omit empty arrays (e.g. if no projects, omit "projects" entirely).
- Extract ALL items for EVERY section — every work experience, every project, every education entry, every certification, every language.
- Parse Markdown formatting carefully. List items (- or *) under work experience should become highlights. Bold text (**text**) indicates emphasis.
- Section headers in Markdown (## or ###) indicate different resume sections."#;

pub async fn parse_markdown_resume(
    workspace_root: &std::path::Path,
    input: ParseMarkdownResumeInput,
) -> Result<ParsedResumeData, String> {
    let content = input.content.trim().to_string();
    if content.len() < 50 {
        return Err("Content is too short to be a valid resume".into());
    }

    let resolved = resolve_provider_config_from_parts(
        workspace_root,
        input.provider.as_deref(),
        input.model.as_deref(),
        input.base_url.as_deref(),
    )?;

    let locale = input.locale.unwrap_or_else(|| "zh".to_string());
    let language = locale.clone();

    let client = reqwest::Client::new();
    let endpoint = format!(
        "{}/chat/completions",
        resolved.base_url.trim_end_matches('/')
    );

    let messages = vec![
        json!({
            "role": "system",
            "content": MARKDOWN_PARSE_SYSTEM_PROMPT
        }),
        json!({
            "role": "user",
            "content": format!("Below is a resume written in Markdown format. Extract all resume information using the EXACT JSON schema from the system prompt.\n\n---\n{}\n---", content)
        }),
    ];

    let response = client
        .post(&endpoint)
        .bearer_auth(&resolved.api_key)
        .header("Content-Type", "application/json")
        .json(&json!({
            "model": resolved.model,
            "messages": messages,
            "max_tokens": 16384,
            "temperature": 0.1,
        }))
        .timeout(std::time::Duration::from_secs(120))
        .send()
        .await
        .map_err(|error| format!("AI request failed: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "failed to read error body".into());
        return Err(format!("AI returned {status}: {body}"));
    }

    let response_json: Value = response
        .json()
        .await
        .map_err(|error| format!("Failed to parse AI response: {error}"))?;

    let raw_text = response_json
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .ok_or("Invalid AI response structure")?;

    // Parse the JSON from the response
    let parsed: Value = parse_json_from_text(raw_text)?;

    // Map to sections
    let sections = map_parsed_to_sections(&parsed, &locale);

    let title = parsed
        .get("personalInfo")
        .and_then(|p| p.get("fullName"))
        .and_then(|n| n.as_str())
        .filter(|s| !s.is_empty())
        .unwrap_or("Imported Resume")
        .to_string();

    Ok(ParsedResumeData {
        title,
        template: "classic".to_string(),
        language,
        sections,
    })
}

fn parse_json_from_text(text: &str) -> Result<Value, String> {
    // Try to find JSON in the response
    let text = text.trim();

    // Remove markdown code fences if present
    let text = if text.starts_with("```json") {
        text.trim_start_matches("```json")
            .trim_end_matches("```")
            .trim()
    } else if text.starts_with("```") {
        text.trim_start_matches("```")
            .trim_end_matches("```")
            .trim()
    } else {
        text
    };

    serde_json::from_str(text).map_err(|e| format!("Failed to parse JSON: {e}"))
}

// ============================================================================
// PDF Resume Parser
// ============================================================================

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsePdfResumeInput {
    pub file_path: String,
    pub provider: Option<String>,
    pub model: Option<String>,
    pub base_url: Option<String>,
    pub locale: Option<String>,
}

pub async fn parse_pdf_resume(
    workspace_root: &std::path::Path,
    input: ParsePdfResumeInput,
) -> Result<ParsedResumeData, String> {
    // Extract text from PDF
    let pdf_path = std::path::Path::new(&input.file_path);
    if !pdf_path.exists() {
        return Err(format!("PDF file not found: {}", input.file_path));
    }

    let pdf_bytes = std::fs::read(pdf_path).map_err(|e| format!("Failed to read PDF file: {e}"))?;

    let pdf_text = extract_text_from_pdf(&pdf_bytes)?;

    if pdf_text.trim().len() < 50 {
        return Err(
            "PDF contains too little text to be a valid resume. It may be a scanned document."
                .into(),
        );
    }

    // Reuse the Markdown parser with the extracted text
    let markdown_input = ParseMarkdownResumeInput {
        content: pdf_text,
        provider: input.provider,
        model: input.model,
        base_url: input.base_url,
        locale: input.locale,
    };

    parse_markdown_resume(workspace_root, markdown_input).await
}

fn extract_text_from_pdf(bytes: &[u8]) -> Result<String, String> {
    use pdf_extract::extract_text_from_mem;

    let text = extract_text_from_mem(bytes)
        .map_err(|e| format!("Failed to extract text from PDF: {e}"))?;

    Ok(text)
}

fn map_parsed_to_sections(parsed: &Value, locale: &str) -> Vec<ParsedResumeSection> {
    let mut sections = Vec::new();
    let is_zh = locale.starts_with("zh");

    // Personal Info section
    if let Some(personal_info) = parsed.get("personalInfo") {
        sections.push(ParsedResumeSection {
            section_type: "personalInfo".to_string(),
            title: if is_zh {
                "个人信息"
            } else {
                "Personal Info"
            }
            .to_string(),
            content: personal_info.clone(),
        });
    }

    // Summary section
    if let Some(summary) = parsed.get("summary").and_then(|s| s.as_str()) {
        if !summary.is_empty() {
            sections.push(ParsedResumeSection {
                section_type: "summary".to_string(),
                title: if is_zh { "个人简介" } else { "Summary" }.to_string(),
                content: json!({ "text": summary }),
            });
        }
    }

    // Work Experience section
    if let Some(work) = parsed.get("workExperience").and_then(|w| w.as_array()) {
        if !work.is_empty() {
            sections.push(ParsedResumeSection {
                section_type: "workExperience".to_string(),
                title: if is_zh {
                    "工作经历"
                } else {
                    "Work Experience"
                }
                .to_string(),
                content: json!({ "items": work }),
            });
        }
    }

    // Education section
    if let Some(edu) = parsed.get("education").and_then(|e| e.as_array()) {
        if !edu.is_empty() {
            sections.push(ParsedResumeSection {
                section_type: "education".to_string(),
                title: if is_zh { "教育背景" } else { "Education" }.to_string(),
                content: json!({ "items": edu }),
            });
        }
    }

    // Skills section
    if let Some(skills) = parsed.get("skills").and_then(|s| s.as_array()) {
        if !skills.is_empty() {
            sections.push(ParsedResumeSection {
                section_type: "skills".to_string(),
                title: if is_zh { "专业技能" } else { "Skills" }.to_string(),
                content: json!({ "items": skills }),
            });
        }
    }

    // Projects section
    if let Some(projects) = parsed.get("projects").and_then(|p| p.as_array()) {
        if !projects.is_empty() {
            sections.push(ParsedResumeSection {
                section_type: "projects".to_string(),
                title: if is_zh { "项目经历" } else { "Projects" }.to_string(),
                content: json!({ "items": projects }),
            });
        }
    }

    // Certifications section
    if let Some(certs) = parsed.get("certifications").and_then(|c| c.as_array()) {
        if !certs.is_empty() {
            sections.push(ParsedResumeSection {
                section_type: "certifications".to_string(),
                title: if is_zh {
                    "资格证书"
                } else {
                    "Certifications"
                }
                .to_string(),
                content: json!({ "items": certs }),
            });
        }
    }

    // Languages section
    if let Some(langs) = parsed.get("languages").and_then(|l| l.as_array()) {
        if !langs.is_empty() {
            sections.push(ParsedResumeSection {
                section_type: "languages".to_string(),
                title: if is_zh { "语言能力" } else { "Languages" }.to_string(),
                content: json!({ "items": langs }),
            });
        }
    }

    sections
}

#[cfg(test)]
mod tests {
    use super::{
        extract_openai_delta_text, extract_openai_tool_call_deltas, extract_sse_data_payload,
        extract_url_candidate, extract_urls, finalize_tool_calls, handle_anthropic_sse_event,
        merge_tool_call_delta, push_conversation_messages, replace_first_text_in_json,
        should_search_web, trim_url_token, AnthropicStreamingState, DesktopAiConversationMessage,
        DesktopAiConversationRole, SseEventBuffer, StreamingToolCall,
    };
    use serde_json::json;
    use std::collections::BTreeMap;

    #[test]
    fn sse_buffer_handles_split_boundaries() {
        let mut buffer = SseEventBuffer::default();
        let first = buffer.push(b"data: {\"choices\":[{\"delta\":{\"content\":\"Hel");
        assert!(first.is_empty());

        let second = buffer.push(b"lo\"}}]}\n\ndata: [DONE]\n\n");
        assert_eq!(second.len(), 2);
        assert_eq!(
            extract_sse_data_payload(&second[0]).as_deref(),
            Some("{\"choices\":[{\"delta\":{\"content\":\"Hello\"}}]}")
        );
        assert_eq!(
            extract_sse_data_payload(&second[1]).as_deref(),
            Some("[DONE]")
        );
    }

    #[test]
    fn extracts_openai_delta_text_from_chunk() {
        let payload = "{\"choices\":[{\"delta\":{\"content\":\"stream token\"}}]}";
        assert_eq!(
            extract_openai_delta_text(payload).as_deref(),
            Some("stream token")
        );
    }

    #[test]
    fn extracts_openai_delta_text_from_content_array() {
        let payload =
            "{\"choices\":[{\"delta\":{\"content\":[{\"type\":\"output_text_delta\",\"text\":\"stream \"},{\"type\":\"output_text_delta\",\"text\":\"token\"}]}}]}";
        assert_eq!(
            extract_openai_delta_text(payload).as_deref(),
            Some("stream token")
        );
    }

    #[test]
    fn extracts_urls_from_prompt_text() {
        let urls = extract_urls(
            "帮我看看这个链接 https://docs.bigmodel.cn/cn/coding-plan/overview ，再参考 https://example.com/test?x=1).",
        );
        assert_eq!(
            urls,
            vec![
                "https://docs.bigmodel.cn/cn/coding-plan/overview".to_string(),
                "https://example.com/test?x=1".to_string()
            ]
        );
    }

    #[test]
    fn trims_trailing_punctuation_from_urls() {
        assert_eq!(
            trim_url_token("https://example.com/path?x=1)."),
            "https://example.com/path?x=1"
        );
    }

    #[test]
    fn extracts_url_without_following_instruction_text() {
        assert_eq!(
            extract_url_candidate("https://docs.bigmodel.cn/cn/coding-plan/overview;读一下这个"),
            "https://docs.bigmodel.cn/cn/coding-plan/overview"
        );
    }

    #[test]
    fn extracts_url_without_ascii_suffix_after_semicolon() {
        assert_eq!(
            extract_url_candidate("https://docs.bigmodel.cn/cn/coding-plan/overview;read-this"),
            "https://docs.bigmodel.cn/cn/coding-plan/overview"
        );
    }

    #[test]
    fn extracts_url_without_following_clause_after_comma() {
        assert_eq!(
            extract_url_candidate("https://docs.bigmodel.cn/cn/coding-plan/overview,看看这个"),
            "https://docs.bigmodel.cn/cn/coding-plan/overview"
        );
    }

    #[test]
    fn detects_search_intent_from_prompt_text() {
        assert!(should_search_web("帮我搜索 MiniMax M2 最新能力"));
        assert!(should_search_web("look up the latest tauri updater docs"));
    }

    #[test]
    fn ignores_normal_resume_edit_prompts() {
        assert!(!should_search_web("帮我优化这段工作经历，写得更量化一些"));
        assert!(!should_search_web("rewrite this summary to sound stronger"));
    }

    #[test]
    fn conversation_history_keeps_roles_and_skips_blank_messages() {
        let mut messages = Vec::new();
        push_conversation_messages(
            &mut messages,
            &[
                DesktopAiConversationMessage {
                    role: DesktopAiConversationRole::User,
                    content: "上一句用户提问".into(),
                },
                DesktopAiConversationMessage {
                    role: DesktopAiConversationRole::Assistant,
                    content: "  回复内容  ".into(),
                },
                DesktopAiConversationMessage {
                    role: DesktopAiConversationRole::Assistant,
                    content: "   ".into(),
                },
            ],
        );

        assert_eq!(
            messages,
            vec![
                json!({
                    "role": "user",
                    "content": "上一句用户提问",
                }),
                json!({
                    "role": "assistant",
                    "content": "回复内容",
                }),
            ]
        );
    }

    #[test]
    fn extracts_openai_tool_call_deltas_from_stream_chunk() {
        let payload = r#"{"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_123","type":"function","function":{"name":"updateSection","arguments":"{\"sectionId\":\"sec_1\""}}]}}]}"#;
        let deltas = extract_openai_tool_call_deltas(payload);

        assert_eq!(deltas.len(), 1);
        assert_eq!(deltas[0].index, 0);
        assert_eq!(deltas[0].id.as_deref(), Some("call_123"));
        assert_eq!(deltas[0].name.as_deref(), Some("updateSection"));
        assert_eq!(
            deltas[0].arguments_fragment.as_deref(),
            Some("{\"sectionId\":\"sec_1\"")
        );
    }

    #[test]
    fn finalizes_streamed_tool_call_arguments() {
        let mut tool_calls = BTreeMap::<usize, StreamingToolCall>::new();
        for payload in [
            r#"{"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_123","type":"function","function":{"name":"updateSection","arguments":"{\"sectionId\":\"sec_1\","}}]}}]}"#,
            r#"{"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\"content\":{\"text\":\"updated\"}}"}}]}}]}"#,
        ] {
            for delta in extract_openai_tool_call_deltas(payload) {
                merge_tool_call_delta(&mut tool_calls, delta);
            }
        }

        let finalized = finalize_tool_calls(tool_calls).expect("tool calls should parse");
        assert_eq!(finalized.len(), 1);
        assert_eq!(finalized[0].id, "call_123");
        assert_eq!(finalized[0].name, "updateSection");
        assert_eq!(
            finalized[0].arguments,
            json!({
                "sectionId": "sec_1",
                "content": { "text": "updated" },
            })
        );
    }

    #[test]
    fn replaces_first_matching_text_in_nested_json() {
        let mut content = json!({
            "items": [
                {
                    "description": "old text",
                    "highlights": ["old text", "keep"]
                }
            ]
        });

        assert!(replace_first_text_in_json(
            &mut content,
            "old text",
            "new text"
        ));
        assert_eq!(
            content,
            json!({
                "items": [
                    {
                        "description": "new text",
                        "highlights": ["old text", "keep"]
                    }
                ]
            })
        );
    }

    #[test]
    fn collects_anthropic_tool_use_from_stream_events() {
        let mut state = AnthropicStreamingState::default();

        handle_anthropic_sse_event(
            "content_block_start",
            r#"{"index":1,"content_block":{"type":"tool_use","id":"toolu_1","name":"replaceResumeText","input":{}}}"#,
            &mut state,
        )
        .expect("tool block should start");
        handle_anthropic_sse_event(
            "content_block_delta",
            r#"{"index":1,"delta":{"type":"input_json_delta","partial_json":"{\"patches\":[{\"sectionId\":\"summary-1\","}}"#,
            &mut state,
        )
        .expect("first input chunk should parse");
        handle_anthropic_sse_event(
            "content_block_delta",
            r#"{"index":1,"delta":{"type":"input_json_delta","partial_json":"\"originalText\":\"old\",\"replacementText\":\"new\"}]}"}}"#,
            &mut state,
        )
        .expect("second input chunk should parse");

        let tool_calls = state
            .finalize_tool_calls()
            .expect("tool call input should parse");
        assert_eq!(tool_calls.len(), 1);
        assert_eq!(tool_calls[0].id, "toolu_1");
        assert_eq!(tool_calls[0].name, "replaceResumeText");
        assert_eq!(
            tool_calls[0].arguments,
            json!({
                "patches": [
                    {
                        "sectionId": "summary-1",
                        "originalText": "old",
                        "replacementText": "new",
                    }
                ]
            })
        );
    }
}
