from pydantic import BaseModel

# Risk questionnaire: Q1 is a gateway (contains personal data?)
# All questions map to probability/impact using the weights below.
QUESTIONNAIRE_QUESTIONS = [
    {"id": "q1", "text": "Does this activity involve personal data?", "is_gateway": True},
    {"id": "q2", "text": "Does it involve sensitive personal data (health, biometric, financial)?"},
    {"id": "q3", "text": "Are data subjects unable to opt out of this processing?"},
    {"id": "q4", "text": "Could unauthorized access cause a monetary loss or regulatory sanction?"},
    {"id": "q5", "text": "Is data transferred outside the country?"},
    {"id": "q6", "text": "Is the volume of data subjects > 1 000?"},
    {"id": "q7", "text": "Does the activity use automated decision-making or profiling?"},
    {"id": "q8", "text": "Is backup and recovery tested at least annually?"},
    {"id": "q9", "text": "Are access controls (MFA, RBAC) applied to this data?"},
    {"id": "q10", "text": "Is there a documented incident response plan for this activity?"},
]

# YES on these questions raises impact
_IMPACT_WEIGHTS = {"q2": 1, "q4": 1, "q5": 1, "q7": 1}
# YES on these raises probability
_PROBABILITY_WEIGHTS = {"q3": 1, "q6": 1}
# NO on these raises probability (they are controls)
_CONTROL_QUESTIONS = {"q8", "q9", "q10"}


def compute_scores(responses: dict[str, bool]) -> tuple[int, int, int, str]:
    """Return (probability, impact, risk_score, risk_level). Formula: P×I, range 1-25."""
    probability = 1
    impact = 1

    for q_id, weight in _IMPACT_WEIGHTS.items():
        if responses.get(q_id) is True:
            impact = min(5, impact + weight)

    for q_id, weight in _PROBABILITY_WEIGHTS.items():
        if responses.get(q_id) is True:
            probability = min(5, probability + weight)

    for q_id in _CONTROL_QUESTIONS:
        if responses.get(q_id) is False:
            probability = min(5, probability + 1)

    risk_score = probability * impact
    if risk_score <= 8:
        level = "LOW"
    elif risk_score <= 16:
        level = "MEDIUM"
    else:
        level = "HIGH"

    return probability, impact, risk_score, level


class RiskAssessmentCreate(BaseModel):
    """RiskAssessmentCreate schema/model definition."""

    treatment_activity_id: int
    responses: dict[str, bool]
    notes: str = ""


class RiskAssessmentUpdate(BaseModel):
    """RiskAssessmentUpdate schema/model definition."""

    responses: dict[str, bool] | None = None
    notes: str | None = None
    status: str | None = None


class RiskAssessmentRead(BaseModel):
    """RiskAssessmentRead schema/model definition."""

    id: int
    tenant_id: int
    treatment_activity_id: int
    analyst_id: int | None
    responses: dict[str, bool]
    probability: int
    impact: int
    risk_score: int
    risk_level: str
    status: str
    notes: str

    model_config = {"from_attributes": True}


class QuestionnaireSchema(BaseModel):
    """QuestionnaireSchema schema/model definition."""

    questions: list[dict]
