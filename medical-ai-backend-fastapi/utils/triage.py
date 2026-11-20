def evaluate_risk_status(symptoms_input: str, ai_report: dict) -> str:
    """
    Evaluates the risk status (pending, reviewed, flagged, critical) 
    based on symptom input keywords and Gemini's generated RAG assessment urgency level.
    """
    if not ai_report:
        return "pending"

    urgency = ai_report.get("urgency_level", "").lower()
    red_flags = ai_report.get("red_flags_detected", [])

    # Map Gemini urgency levels to database enum values ('pending', 'reviewed', 'flagged')
    if urgency in ["critical", "high"] or len(red_flags) > 0:
        return "flagged"
    
    if urgency in ["medium", "low"]:
        return "reviewed"

    return "pending"