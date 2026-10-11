"""Tests for free-text disruption parser."""

import pytest
from app.parser import parse_disruptions_text, parse_time_str


def test_parse_time_str():
    assert parse_time_str("10:00") == 600
    assert parse_time_str("11:30") == 690
    assert parse_time_str("00:00") == 0
    assert parse_time_str("23:59") == 1439
    assert parse_time_str("10am") == 600
    assert parse_time_str("2pm") == 840
    assert parse_time_str("2:30pm") == 870


def test_parser_single_train_delay():
    text = "Train T12 delayed 20 min"
    res = parse_disruptions_text(text)
    assert len(res.disruptions) == 1
    d = res.disruptions[0]
    assert d.type == "train_delay"
    assert d.train_id == "T12"
    assert d.delay_minutes == 20
    assert res.needs_confirmation is True


def test_parser_platform_closure():
    text = "Platform P2 closed 10:00-11:00"
    res = parse_disruptions_text(text)
    assert len(res.disruptions) == 1
    d = res.disruptions[0]
    assert d.type == "platform_closure"
    assert d.platform_id == "P2"
    assert d.start_time == 600
    assert d.end_time == 660
    assert d.formatted_start == "10:00"
    assert d.formatted_end == "11:00"
    assert res.needs_confirmation is True


def test_parser_multiple_disruptions_in_one_sentence():
    text = "Train T12 delayed 20 min. Platform P2 closed 10:00-11:00"
    res = parse_disruptions_text(text)
    assert len(res.disruptions) == 2
    types = [d.type for d in res.disruptions]
    assert "train_delay" in types
    assert "platform_closure" in types
    assert res.needs_confirmation is True


def test_parser_conjunction_and_multiline():
    text = "Train T101 delayed by 15 mins and platform P3 closed from 10:30 to 11:30 due to maintenance"
    res = parse_disruptions_text(text)
    assert len(res.disruptions) == 2
    d1 = next(d for d in res.disruptions if d.type == "train_delay")
    assert d1.train_id == "T101"
    assert d1.delay_minutes == 15

    d2 = next(d for d in res.disruptions if d.type == "platform_closure")
    assert d2.platform_id == "P3"
    assert d2.start_time == 630
    assert d2.end_time == 690


def test_parser_ambiguous_and_unknown_text():
    text = "Unscheduled delay due to rainy weather in sector 9"
    res = parse_disruptions_text(text)
    assert len(res.disruptions) == 0
    assert len(res.warnings) > 0
    assert res.needs_confirmation is True


def test_parser_empty_text():
    res = parse_disruptions_text("")
    assert len(res.disruptions) == 0
    assert len(res.warnings) > 0
    assert res.needs_confirmation is True


def test_parser_invalid_closure_times():
    text = "Platform P1 closed 11:00-10:00"  # start after end
    res = parse_disruptions_text(text)
    assert len(res.disruptions) == 0
    assert any("earlier than end time" in w for w in res.warnings)

