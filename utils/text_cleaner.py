def clean_transcript(text: str):

    sponsor_patterns = [

        "this video is sponsored by brilliant",
        "thanks to brilliant",
        "brilliant.org",
        "koji",

    ]

    cleaned = text

    for pattern in sponsor_patterns:

        cleaned = cleaned.replace(
            pattern,
            ""
        )

        cleaned = cleaned.replace(
            pattern.title(),
            ""
        )

    return cleaned