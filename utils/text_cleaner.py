def remove_sponsor_sections(text):

    banned_phrases = [

        "this video is sponsored",
        "sponsored by",
        "brilliant",
        "starbirds",
        "free trial",
        "membership",
        "patreon",
        "use the link below",
        "thanks to our sponsor",

    ]

    lines = text.split("\n")

    cleaned_lines = []

    for line in lines:

        line_lower = line.lower()

        if any(

            phrase in line_lower

            for phrase in banned_phrases

        ):
            continue

        cleaned_lines.append(line)

    return "\n".join(cleaned_lines)