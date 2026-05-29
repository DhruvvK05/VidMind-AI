from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer
)

from reportlab.lib.styles import getSampleStyleSheet


def create_summary_pdf(result, output_path):

    doc = SimpleDocTemplate(output_path)

    styles = getSampleStyleSheet()

    content = [

        Paragraph(
            result["title"],
            styles["Title"]
        ),

        Spacer(1, 12),

        Paragraph(
            "<b>Summary</b>",
            styles["Heading2"]
        ),

        Paragraph(
            result["summary"],
            styles["BodyText"]
        ),

        Spacer(1, 12),

        Paragraph(
            "<b>Key Takeaways</b>",
            styles["Heading2"]
        ),

        Paragraph(
            result["key_takeaways"],
            styles["BodyText"]
        ),

        Spacer(1, 12),

        Paragraph(
            "<b>Important Concepts</b>",
            styles["Heading2"]
        ),

        Paragraph(
            result["important_concepts"],
            styles["BodyText"]
        ),

        Spacer(1, 12),

        Paragraph(
            "<b>Interesting Questions</b>",
            styles["Heading2"]
        ),

        Paragraph(
            result["interesting_questions"],
            styles["BodyText"]
        ),
    ]
    doc.build(content)

def create_chat_pdf(
    chat_history,
    output_path
):

    doc = SimpleDocTemplate(output_path)

    styles = getSampleStyleSheet()

    content = []

    content.append(

        Paragraph(
            "VidMind Chat Export",
            styles["Title"]
        )

    )

    content.append(
        Spacer(1, 12)
    )

    for msg in chat_history:

        role = msg["role"].upper()

        content.append(

            Paragraph(
                f"<b>{role}</b>",
                styles["Heading3"]
            )

        )

        content.append(

            Paragraph(
                msg["content"],
                styles["BodyText"]
            )

        )

        content.append(
            Spacer(1, 8)
        )

    doc.build(content)