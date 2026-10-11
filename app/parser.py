"""Free-text disruption parsing module using regex and dateparser.

Parses natural language disruption notices without mutating the timetable.
Unknown identifiers, unparsable fragments, or ambiguous requests produce warnings.
"""

import re
from typing import List, Tuple, Optional
import dateparser

from app.models import (
    Disruption,
    ParseDisruptionsResponse,
    minutes_to_hhmm,
)


def parse_time_str(time_str: str) -> Optional[int]:
    """Parses a time string into minutes after midnight."""
    cleaned = time_str.strip().lower()

    # Direct HH:MM (24-hour or standard)
    m = re.match(r"^(\d{1,2}):(\d{2})$", cleaned)
    if m:
        hh, mm = int(m.group(1)), int(m.group(2))
        if 0 <= hh <= 23 and 0 <= mm <= 59:
            return hh * 60 + mm
        return None

    # Handle 12-hour format e.g. 10am, 2pm, 10:30am, 2:15pm
    m_12h = re.match(r"^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$", cleaned)
    if m_12h:
        hh = int(m_12h.group(1))
        mm = int(m_12h.group(2) or 0)
        ampm = m_12h.group(3)
        if 1 <= hh <= 12 and 0 <= mm <= 59:
            if ampm == "pm" and hh < 12:
                hh += 12
            elif ampm == "am" and hh == 12:
                hh = 0
            return hh * 60 + mm

    # Fallback to dateparser
    dt = dateparser.parse(cleaned)
    if dt:
        return dt.hour * 60 + dt.minute

    return None


def parse_disruptions_text(text: str) -> ParseDisruptionsResponse:
    """Parses free-text disruption reports into structured disruption models."""
    if not text or not text.strip():
        return ParseDisruptionsResponse(
            raw_text=text or "",
            disruptions=[],
            warnings=["Input text is empty or contains no instructions."],
            needs_confirmation=True,
        )

    raw_text = text.strip()
    disruptions: List[Disruption] = []
    warnings: List[str] = []

    # Split text into segments based on sentence ends, semicolons, commas followed by conjunctions
    # e.g., "Train T12 delayed 20 min. Platform P2 closed 10:00-11:00"
    # or "Train T12 delayed 20 min and Platform P2 closed 10:00-11:00"
    raw_segments = re.split(r"(?:[\r\n]+|[;.]\s*|,\s*(?:and|also)\s+|\s+and\s+)", raw_text, flags=re.IGNORECASE)
    segments = [s.strip() for s in raw_segments if s.strip()]

    # Regex patterns for train delay
    # e.g.: "Train T12 delayed 20 min", "Train T101 delayed by 15 minutes", "T12 delay 20m", "Delay train T14 by 10 min"
    delay_pattern_1 = re.compile(
        r"(?:delay\s+(?:train\s+)?(?P<train_id_pre>[a-zA-Z]?\d+)\s+by\s+(?P<delay_pre>\d+)\s*(?:min|mins|minutes|m)?)"
        r"|"
        r"(?:(?:train\s+)?(?P<train_id>[a-zA-Z]?\d+)\s+(?:is\s+)?delayed(?:\s+by)?\s+(?P<delay>\d+)\s*(?:min|mins|minutes|m)?)"
        r"|"
        r"(?:(?:train\s+)?(?P<train_id_alt>[a-zA-Z]?\d+)\s+delay(?::|\s+)?(?P<delay_alt>\d+)\s*(?:min|mins|minutes|m)?)",
        re.IGNORECASE,
    )

    # Regex patterns for platform closure
    # e.g.: "Platform P2 closed 10:00-11:00", "Platform 2 closed from 10:00 to 11:00", "P3 closed between 10:30 and 11:30"
    closure_pattern = re.compile(
        r"(?:platform\s+(?:p)?|p)(?P<plat_num>\d+)\s+(?:is\s+)?(?:closed|shut|closure)\s*"
        r"(?:from|between)?\s*(?P<start_time>\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*"
        r"(?:-|to|until|through|and)\s*"
        r"(?P<end_time>\d{1,2}(?::\d{2})?\s*(?:am|pm)?)",
        re.IGNORECASE,
    )

    for seg in segments:
        seg_matched = False

        # Check for platform closure
        match_closure = closure_pattern.search(seg)
        if match_closure:
            seg_matched = True
            plat_num = match_closure.group("plat_num")
            platform_id = f"P{plat_num}"
            start_raw = match_closure.group("start_time")
            end_raw = match_closure.group("end_time")

            start_min = parse_time_str(start_raw)
            end_min = parse_time_str(end_raw)

            if start_min is None or end_min is None:
                warnings.append(
                    f"Could not parse closure times '{start_raw}' or '{end_raw}' for platform {platform_id} in segment: '{seg}'"
                )
            elif start_min >= end_min:
                warnings.append(
                    f"Closure start time '{start_raw}' ({start_min} min) must be strictly earlier than end time '{end_raw}' ({end_min} min) for platform {platform_id}."
                )
            else:
                # Extract reason if present, e.g. "due to maintenance"
                reason = "Platform closure parsed from request"
                reason_match = re.search(r"(?:due to|because of|for)\s+([^,.]+)", seg, re.IGNORECASE)
                if reason_match:
                    reason = reason_match.group(1).strip()

                disruptions.append(
                    Disruption(
                        type="platform_closure",
                        platform_id=platform_id,
                        start_time=start_min,
                        end_time=end_min,
                        formatted_start=minutes_to_hhmm(start_min),
                        formatted_end=minutes_to_hhmm(end_min),
                        reason=reason,
                    )
                )

        # Check for train delay
        match_delay = delay_pattern_1.search(seg)
        if match_delay:
            seg_matched = True
            raw_tid = (
                match_delay.group("train_id")
                or match_delay.group("train_id_pre")
                or match_delay.group("train_id_alt")
            )
            raw_delay = (
                match_delay.group("delay")
                or match_delay.group("delay_pre")
                or match_delay.group("delay_alt")
            )

            # Normalize train ID (e.g., 12 -> T12 if purely numeric, or T12 if already T12)
            if raw_tid.isdigit():
                train_id = f"T{raw_tid}"
            else:
                train_id = raw_tid.upper()

            try:
                delay_val = int(raw_delay)
            except ValueError:
                delay_val = 0

            if delay_val <= 0:
                warnings.append(f"Delay amount for train {train_id} must be positive, found: {delay_val} in '{seg}'")
            else:
                reason = "Reported delay parsed from request"
                reason_match = re.search(r"(?:due to|because of|for)\s+([^,.]+)", seg, re.IGNORECASE)
                if reason_match:
                    reason = reason_match.group(1).strip()

                disruptions.append(
                    Disruption(
                        type="train_delay",
                        train_id=train_id,
                        delay_minutes=delay_val,
                        reason=reason,
                    )
                )

        if not seg_matched:
            # Check if segment looks like an ambiguous attempt
            if any(k in seg.lower() for k in ["train", "platform", "delay", "closed", "cancel", "track"]):
                warnings.append(f"Ambiguous or unparseable disruption instruction in clause: '{seg}'")
            else:
                warnings.append(f"Unrecognized phrase ignored: '{seg}'")

    if not disruptions and not warnings:
        warnings.append("No actionable disruption instructions could be identified.")

    return ParseDisruptionsResponse(
        raw_text=raw_text,
        disruptions=disruptions,
        warnings=warnings,
        needs_confirmation=True,
    )

