import os
import json
import html
import streamlit as st
import streamlit.components.v1 as components
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables from .env file
load_dotenv()

# Page configuration
st.set_page_config(
    page_title="AI Professional Email & LinkedIn Message Writer",
    page_icon="✉️",
    layout="centered",
)

# Custom subtle CSS for clean typography and spacing
st.markdown(
    """
    <style>
        .main .block-container {
            padding-top: 2rem;
            padding-bottom: 3rem;
            max-width: 820px;
        }
        .output-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 1.25rem;
            margin-top: 0.75rem;
            margin-bottom: 1rem;
            white-space: pre-wrap;
            font-size: 0.96rem;
            line-height: 1.6;
            color: #0f172a;
        }
        .subject-box {
            background-color: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 0.75rem 1rem;
            font-weight: 600;
            color: #0f172a;
            margin-bottom: 0.75rem;
        }
    </style>
    """,
    unsafe_allow_html=True,
)

MESSAGE_TYPES = [
    "Job Application",
    "Referral Request",
    "Interview Follow-up",
    "Internship Request",
    "Thank-you After Interview",
]

PLATFORMS = ["Email", "LinkedIn"]


def get_gemini_client() -> genai.Client:
    """Initialize and return the Google GenAI client using the .env API key."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or api_key == "your_gemini_api_key_here":
        raise ValueError(
            "GEMINI_API_KEY is missing or not configured. "
            "Please add your Gemini API key to the .env file."
        )
    return genai.Client(api_key=api_key)


def render_copy_button(text_to_copy: str, button_label: str = "Copy Message") -> None:
    """Render a working clipboard Copy button in Streamlit."""
    js_text = json.dumps(text_to_copy)
    js_label = json.dumps(button_label)
    components.html(
        f"""
        <button
            id="copy-btn"
            style="
                background-color: #1d4ed8;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 0.5rem 1rem;
                font-size: 0.875rem;
                font-weight: 600;
                cursor: pointer;
                font-family: sans-serif;
            "
        >
            {html.escape(button_label)}
        </button>
        <script>
            const textToCopy = {js_text};
            const defaultLabel = {js_label};
            const btn = document.getElementById('copy-btn');
            btn.addEventListener('click', () => {{
                navigator.clipboard.writeText(textToCopy).then(() => {{
                    btn.innerText = 'Copied!';
                    btn.style.backgroundColor = '#15803d';
                    setTimeout(() => {{
                        btn.innerText = defaultLabel;
                        btn.style.backgroundColor = '#1d4ed8';
                    }}, 2000);
                }});
            }});
        </script>
        """,
        height=46,
    )


def generate_professional_message(
    message_type: str,
    recipient: str,
    key_points: str,
    platform: str,
    previous_draft: str = "",
    variation: int = 1,
) -> dict:
    """Call Google Gemini API to generate a personalized professional message."""
    client = get_gemini_client()
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    if platform == "LinkedIn":
        system_instruction = (
            "You are an expert career coach helping college students write polite, clear, "
            "and professional LinkedIn outreach messages. "
            "STRICT RULE: The message MUST be strictly under 300 characters total "
            "(including spaces, greeting, and closing). Aim for 210 to 280 characters. "
            "Return JSON with 'subject' (empty string) and 'message'."
        )
    else:
        system_instruction = (
            "You are an expert career coach helping college students write polite, clear, "
            "and professional emails to recruiters, HR professionals, and professors. "
            "Generate a crisp, relevant Subject Line and a complete, well-structured Email Body "
            "with greeting, body integrating the user's key points, polite call-to-action, "
            "and sign-off with [Your Name]. "
            "Return JSON with 'subject' and 'message'."
        )

    regeneration_note = ""
    if previous_draft:
        regeneration_note = (
            f"\n\nPlease write variation #{variation} with fresh phrasing and a different "
            f"opening sentence compared to this previous version:\n{previous_draft}"
        )

    prompt = (
        f"Message Type: {message_type}\n"
        f"Platform: {platform}\n"
        f"Recipient: {recipient}\n"
        f"Key Points to Include:\n{key_points}"
        f"{regeneration_note}"
    )

    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema={
                "type": "OBJECT",
                "properties": {
                    "subject": {"type": "STRING"},
                    "message": {"type": "STRING"},
                },
                "required": ["subject", "message"],
            },
        ),
    )

    result = json.loads(response.text)
    subject = (result.get("subject") or "").strip()
    message = (result.get("message") or "").strip()

    # Safety check to strictly keep LinkedIn messages under 300 characters
    if platform == "LinkedIn":
        subject = ""
        if len(message) >= 300:
            shorten_response = client.models.generate_content(
                model=model_name,
                contents=(
                    "Shorten this LinkedIn message to strictly under 285 characters "
                    "while keeping it polite, complete, and preserving all key points:\n\n"
                    f"{message}"
                ),
            )
            shortened = (shorten_response.text or "").strip()
            if shortened:
                message = shortened
            if len(message) >= 300:
                message = message[:295].rsplit(" ", 1)[0] + "..."

    return {"subject": subject, "message": message}


# Initialize session state
if "generated_output" not in st.session_state:
    st.session_state.generated_output = None
if "variation" not in st.session_state:
    st.session_state.variation = 1
if "last_inputs" not in st.session_state:
    st.session_state.last_inputs = None
if "status_message" not in st.session_state:
    st.session_state.status_message = None

# Application Header
st.title("AI Professional Email & LinkedIn Message Writer")
st.write(
    "Generate polite, clear, and personalized professional emails and LinkedIn messages "
    "for job applications, referrals, internships, and interview follow-ups."
)
st.divider()

# Input Form
with st.form("message_form"):
    col1, col2 = st.columns(2)
    with col1:
        message_type = st.selectbox("Message Type", MESSAGE_TYPES)
    with col2:
        platform = st.radio("Platform", PLATFORMS, horizontal=True)

    recipient = st.text_input(
        "Recipient (Name or Designation)",
        placeholder="e.g., Priya Sharma, Technical Recruiter at Razorpay",
    )

    key_points = st.text_area(
        "Key Points (Enter 2–3 important points)",
        height=130,
        placeholder=(
            "- Final-year B.Tech Computer Science student (8.9 CGPA)\n"
            "- Built a full-stack task manager using React and Python\n"
            "- Seeking a 6-month Software Engineering Internship"
        ),
    )

    submitted = st.form_submit_button("Generate Message", type="primary", use_container_width=True)

# Handle Initial Generation
if submitted:
    if not recipient.strip():
        st.error("Please enter the recipient's name or designation.")
    elif not key_points.strip():
        st.error("Please enter 2–3 key points to include in the message.")
    else:
        with st.spinner("Generating your professional message with Gemini..."):
            try:
                st.session_state.variation = 1
                output = generate_professional_message(
                    message_type=message_type,
                    recipient=recipient.strip(),
                    key_points=key_points.strip(),
                    platform=platform,
                )
                st.session_state.generated_output = output
                st.session_state.last_inputs = {
                    "message_type": message_type,
                    "recipient": recipient.strip(),
                    "key_points": key_points.strip(),
                    "platform": platform,
                }
                st.session_state.status_message = (
                    f"Professional {platform} message generated successfully!"
                )
            except ValueError as err:
                st.error(str(err))
            except Exception as err:
                st.error(f"Failed to generate message. Please check your API key or network. ({err})")

# Display Generated Output
if st.session_state.generated_output and st.session_state.last_inputs:
    output = st.session_state.generated_output
    saved_inputs = st.session_state.last_inputs
    saved_platform = saved_inputs["platform"]

    if st.session_state.status_message:
        st.success(st.session_state.status_message)

    st.subheader("Generated Output")

    if saved_platform == "Email":
        st.markdown("**Subject Line:**")
        st.markdown(
            f"<div class='subject-box'>{html.escape(output['subject'])}</div>",
            unsafe_allow_html=True,
        )
        st.markdown("**Email Body:**")
        st.markdown(
            f"<div class='output-box'>{html.escape(output['message'])}</div>",
            unsafe_allow_html=True,
        )
        full_copy_text = f"Subject: {output['subject']}\n\n{output['message']}"
    else:
        char_count = len(output["message"])
        st.markdown(f"**LinkedIn Message ({char_count} / 300 characters):**")
        st.markdown(
            f"<div class='output-box'>{html.escape(output['message'])}</div>",
            unsafe_allow_html=True,
        )
        full_copy_text = output["message"]

    # Action Buttons: Copy & Regenerate
    btn_col1, btn_col2 = st.columns([1, 1])
    with btn_col1:
        render_copy_button(full_copy_text, "Copy Message")
    with btn_col2:
        if st.button("Regenerate", use_container_width=True):
            with st.spinner("Generating an alternative version..."):
                try:
                    st.session_state.variation += 1
                    new_output = generate_professional_message(
                        message_type=saved_inputs["message_type"],
                        recipient=saved_inputs["recipient"],
                        key_points=saved_inputs["key_points"],
                        platform=saved_platform,
                        previous_draft=output["message"],
                        variation=st.session_state.variation,
                    )
                    st.session_state.generated_output = new_output
                    st.session_state.status_message = (
                        f"New {saved_platform} variation generated successfully!"
                    )
                    st.rerun()
                except Exception as err:
                    st.error(f"Regeneration failed: {err}")
