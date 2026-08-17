"""Pure unit tests for the risk-scoring engine (``compute_scores``).

Target: ``app.schemas.risk_assessment.compute_scores`` — the function that turns a
DPIA questionnaire into an ISO/IEC 27005 risk score (Probability x Impact) and a
GREEN/YELLOW/RED level. These tests exercise the function in isolation, with no
database, HTTP layer, or fixtures, so a failure points straight at the scoring
logic and nothing else.

Scoring contract under test:
  * probability and impact both start at 1 and are clamped to the [1, 5] range
  * impact   += 1 for each YES in {q2, q4, q5, q7}
  * probability += 1 for each YES in {q3, q6}
  * probability += 1 for each NO  in the controls {q8, q9, q10} (a missing control
    is *not* a NO — the check is a strict ``is False``)
  * risk_score = probability * impact, range [1, 25]
  * level: LOW (<= 8) | MEDIUM (9-16) | HIGH (>= 17)
"""

import itertools

import pytest

from app.schemas.risk_assessment import compute_scores

# Every questionnaire key that influences the score (q1 is the gateway and is
# deliberately excluded — it is enforced at the API layer, not here).
SCORING_KEYS = ["q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10"]


def _responses(**flags) -> dict[str, bool]:
    """Build a response dict, defaulting every scoring key to False."""
    base = {k: False for k in SCORING_KEYS}
    base.update(flags)
    return base


# --- Floor and ceiling of the scale ------------------------------------------


def test_minimum_risk_returns_floor_of_scale():
    """Objective: the best possible case (no risk factors, all controls in
    place) must yield the absolute minimum score 1x1 = 1 and LOW. Guards the
    lower bound of the scale and proves probability/impact never drop below 1."""
    result = compute_scores(_responses(q8=True, q9=True, q10=True))
    assert result == (1, 1, 1, "LOW")


def test_maximum_risk_returns_ceiling_of_scale():
    """Objective: the worst case (every risk factor YES, every control absent)
    must saturate at 5x5 = 25 and HIGH. Guards the upper bound and confirms the
    top of the RED band is reachable."""
    result = compute_scores(
        _responses(
            q2=True, q3=True, q4=True, q5=True, q6=True, q7=True, q8=False, q9=False, q10=False
        )
    )
    assert result == (5, 5, 25, "HIGH")


# --- Clamping behaviour -------------------------------------------------------


def test_probability_is_clamped_at_five():
    """Objective: the raw probability sum in the worst case is 1 + 2 (q3,q6) +
    3 (q8,q9,q10 absent) = 6, which must be clamped to 5. Protects against the
    score ever exceeding the documented 1-25 range."""
    probability, _, _, _ = compute_scores(
        _responses(q3=True, q6=True, q8=False, q9=False, q10=False)
    )
    assert probability == 5


def test_impact_is_clamped_at_five():
    """Objective: enabling all four impact questions yields 1 + 4 = 5, hitting
    the clamp exactly. Verifies impact tops out at 5 and cannot overflow the
    matrix."""
    _, impact, _, _ = compute_scores(_responses(q2=True, q4=True, q5=True, q7=True))
    assert impact == 5


# --- Counter-intuitive control semantics -------------------------------------


def test_all_yes_is_medium_because_controls_are_present():
    """Objective: answering YES to every question is NOT the worst case. YES on
    q8/q9/q10 means controls EXIST, so they do not raise probability; the result
    is 3x5 = 15 / MEDIUM, not 25. Documents and locks in the control polarity,
    the most error-prone part of the formula."""
    result = compute_scores({f"q{i}": True for i in range(1, 11)})
    assert result == (3, 5, 15, "MEDIUM")


def test_missing_control_is_not_treated_as_a_failed_control():
    """Objective: an omitted control key must differ from an explicit NO, because
    the implementation uses a strict ``is False`` test. Missing q8 leaves
    probability at 1; q8=False raises it to 2. Prevents a regression to a loose
    truthiness check that would over-penalise incomplete questionnaires."""
    missing = compute_scores(_responses(q8=True, q9=True, q10=True))  # q8.. present, True
    omitted = compute_scores({"q9": True, "q10": True})  # q8 entirely absent
    explicit_no = compute_scores({"q8": False, "q9": True, "q10": True})
    assert missing[0] == 1
    assert omitted[0] == 1  # absent key -> not a failed control
    assert explicit_no[0] == 2  # explicit NO -> failed control


def test_missing_risk_key_is_ignored():
    """Objective: impact/probability weights only fire on a strict ``is True``.
    An absent risk key must contribute nothing, so an empty-ish dict cannot
    accidentally inflate the score. Mirrors the control test for the YES side."""
    _, impact, _, _ = compute_scores({"q9": True, "q10": True})  # no impact keys at all
    assert impact == 1


# --- Isolated single-factor effects ------------------------------------------


@pytest.mark.parametrize("impact_q", ["q2", "q4", "q5", "q7"])
def test_each_impact_question_raises_impact_by_one(impact_q):
    """Objective: each of the four impact questions must add exactly 1 to impact
    in isolation (baseline 1 -> 2). Pins down the impact weight table so a
    mis-mapped question is caught."""
    _, impact, _, _ = compute_scores(_responses(**{impact_q: True}, q8=True, q9=True, q10=True))
    assert impact == 2


@pytest.mark.parametrize("prob_q", ["q3", "q6"])
def test_each_probability_question_raises_probability_by_one(prob_q):
    """Objective: each probability question (q3, q6) must add exactly 1 to
    probability in isolation. Pins down the probability weight table."""
    probability, _, _, _ = compute_scores(_responses(**{prob_q: True}, q8=True, q9=True, q10=True))
    assert probability == 2


@pytest.mark.parametrize("control_q", ["q8", "q9", "q10"])
def test_each_absent_control_raises_probability_by_one(control_q):
    """Objective: a single failed control (NO) must add exactly 1 to probability
    while the other controls stay satisfied. Confirms the controls set and that
    they act on probability, not impact."""
    present = {"q8": True, "q9": True, "q10": True}
    present[control_q] = False
    probability, impact, _, _ = compute_scores(_responses(**present))
    assert probability == 2
    assert impact == 1


# --- Level partition boundaries (boundary-value analysis) ---------------------


def test_boundary_score_eight_is_low():
    """Objective: score 8 is the inclusive upper edge of LOW. Built as P2 x I4.
    Boundary-value test guarding the LOW/MEDIUM cut at <= 8."""
    _, _, score, level = compute_scores(
        _responses(q3=True, q2=True, q4=True, q5=True, q8=True, q9=True, q10=True)
    )
    assert (score, level) == (8, "LOW")


def test_boundary_score_nine_is_medium():
    """Objective: score 9 is the lower edge of MEDIUM. Built as P3 x I3. Confirms
    the first value above the LOW threshold flips to MEDIUM."""
    _, _, score, level = compute_scores(
        _responses(q3=True, q6=True, q2=True, q4=True, q8=True, q9=True, q10=True)
    )
    assert (score, level) == (9, "MEDIUM")


def test_boundary_score_sixteen_is_medium():
    """Objective: score 16 is the highest *achievable* MEDIUM (P4 x I4). Guards
    the upper edge of the YELLOW band; 17-19 are not expressible as a product of
    two factors in [1,5], so 16 is the last MEDIUM before the jump to HIGH."""
    _, _, score, level = compute_scores(
        _responses(q3=True, q2=True, q4=True, q5=True, q8=False, q9=False, q10=True)
    )
    assert (score, level) == (16, "MEDIUM")


def test_boundary_score_twenty_is_high():
    """Objective: 20 (P4 x I5) is the lowest achievable HIGH score, since the
    band starts at 17 but no product lands in 17-19. Guards the MEDIUM/HIGH cut
    from the RED side."""
    _, _, score, level = compute_scores(
        _responses(q2=True, q4=True, q5=True, q7=True, q3=True, q8=False, q9=False, q10=True)
    )
    assert (score, level) == (20, "HIGH")


# --- Gateway independence -----------------------------------------------------


def test_score_is_independent_of_gateway_q1():
    """Objective: compute_scores must ignore q1 entirely (the gateway is enforced
    by the API, not the scorer). Toggling q1 must not change any output.
    Documents the separation of concerns between gateway and scoring."""
    body = _responses(q2=True, q4=True, q8=False)
    with_q1 = compute_scores({**body, "q1": True})
    without_q1 = compute_scores({**body, "q1": False})
    assert with_q1 == without_q1


# --- Robustness ---------------------------------------------------------------


def test_empty_responses_default_to_minimum():
    """Objective: an empty dict must not raise and must default to the minimum
    (1, 1, 1, LOW), because no key satisfies either ``is True`` or ``is False``
    of a control. Proves the scorer is total over partial input."""
    assert compute_scores({}) == (1, 1, 1, "LOW")


# --- Whole-domain invariants (exhaustive) ------------------------------------


@pytest.mark.parametrize("combo", list(itertools.product([True, False], repeat=len(SCORING_KEYS))))
def test_invariants_hold_over_entire_input_space(combo):
    """Objective: over all 2**9 = 512 possible answer combinations, the core
    invariants must always hold: probability and impact stay in [1,5],
    risk_score == probability * impact, and the level matches the documented
    thresholds. A single exhaustive property check that no specific case can slip
    past."""
    responses = dict(zip(SCORING_KEYS, combo))
    probability, impact, score, level = compute_scores(responses)

    assert 1 <= probability <= 5
    assert 1 <= impact <= 5
    assert score == probability * impact

    expected = "LOW" if score <= 8 else "MEDIUM" if score <= 16 else "HIGH"
    assert level == expected
