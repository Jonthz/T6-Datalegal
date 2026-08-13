"""Cubre el flujo por pasos del wizard del RAT (start → legal-basis → transfers → finalize),
que antes no estaba testeado y ocultó un bug de avance de paso en el frontend."""

from tests.conftest import auth_headers


def test_full_wizard_flow_reaches_finalize(client, dpo_token):
    h = auth_headers(dpo_token)

    r1 = client.post(
        "/api/v1/treatment-activities/wizard/start",
        json={"name": "Wizard", "purpose": "p", "area": "CRÉDITO"},
        headers=h,
    )
    assert r1.status_code == 201, r1.text
    activity = r1.json()
    aid = activity["id"]
    assert activity["rat_code"] == "CRE001"

    r2 = client.patch(
        f"/api/v1/treatment-activities/wizard/{aid}/legal-basis",
        json={
            "legal_basis": "CONTRACT",
            "legal_bases": ["CONTRACT", "LEGAL_OBLIGATION"],
            "complementary_legal_bases": ["ART_28"],
            "personal_data_types": ["EMAIL"],
            "data_subjects": ["CLIENTS"],
        },
        headers=h,
    )
    assert r2.status_code == 200, r2.text
    assert r2.json()["legal_bases"] == ["CONTRACT", "LEGAL_OBLIGATION"]

    r3 = client.patch(
        f"/api/v1/treatment-activities/wizard/{aid}/transfers",
        json={
            "is_cross_border": False,
            "destination_countries": [],
            "processor_name": None,
            "processor_country": None,
        },
        headers=h,
    )
    assert r3.status_code == 200, r3.text

    r4 = client.post(f"/api/v1/treatment-activities/wizard/{aid}/finalize", headers=h)
    assert r4.status_code == 200, r4.text
    assert r4.json()["status"] == "ACTIVE"
