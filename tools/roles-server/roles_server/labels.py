"""The fixed list a reply must come from, and the reasons a request can end in unsure."""

LABELS = ["heading", "body", "caption", "label", "button text", "decorative", "unsure"]

# The reasons of the roles spec, section 9, plus ok
OK = "ok"
UNREACHABLE = "unreachable"
AUTH = "auth"
RATE_LIMITED = "rate-limited"
TIMEOUT = "timeout"
MALFORMED = "malformed"
EMPTY = "empty"
LABEL_OUTSIDE_LIST = "label-outside-list"
TOO_SMALL_TO_SEND = "too-small-to-send"
MIXED_SIZE = "mixed-size"

SCHEMA = {
    "type": "object",
    "properties": {"label": {"type": "string", "enum": LABELS}},
    "required": ["label"],
    "additionalProperties": False,
}

INSTRUCTION = (
    "This image shows one piece of text from a user interface. Choose the one label that says "
    "what kind of text it is. heading: a title that introduces a section or a screen. body: a "
    "paragraph or the main running text. caption: a small note, hint or description attached to "
    "something else. label: the name of a field, a tab or a tag. button text: the words on a "
    "button or a link that does something. decorative: text that is only for looks and carries no "
    "information. unsure: you cannot tell. Answer with the label only, in the format given."
)
