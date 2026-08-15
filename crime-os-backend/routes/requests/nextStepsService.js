// =========================================================
// SUGGESTED NEXT STEPS
// =========================================================
//
// Small, deterministic helper: given a legal request's current state,
// suggest what the investigating officer should do next. This is
// surfaced in API responses (generate/approve/dispatch/response) for
// the UI to show -- it is NOT included in the email sent to the
// provider.
//

const daysBetween = (a, b) => Math.ceil((b - a) / (1000 * 60 * 60 * 24));

const getSuggestedNextSteps = (requestData) => {
  const status = requestData.status;
  const now = new Date();

  switch (status) {
    case "draft":
      return [
        "Review the generated letter for accuracy before sending.",
        "Approve the request to allow it to be dispatched.",
      ];

    case "approved":
      return [
        "Dispatch the approved request to the provider's nodal officer.",
      ];

    case "sent": {
      const steps = [
        "Awaiting a response from the provider.",
      ];
      if (requestData.deadline) {
        const daysLeft = daysBetween(now, new Date(requestData.deadline));
        if (daysLeft > 0) {
          steps.push(`Response is due within ${daysLeft} day(s) (SLA deadline).`);
        } else {
          steps.push(
            "SLA deadline has passed but the request is not yet marked overdue -- consider following up."
          );
        }
      }
      steps.push("Record the provider's response as soon as it is received.");
      return steps;
    }

    case "overdue":
      return [
        "SLA deadline has passed with no response recorded.",
        "Send a follow-up / escalation to the provider's nodal officer.",
        "Consider escalating to the provider's grievance or law-enforcement liaison channel.",
      ];

    case "completed":
      return [
        "Response has been recorded and linked to case entities.",
        "Review the newly added entities and cross-reference them against other evidence.",
        "Consider whether a follow-up request is needed based on the new information.",
      ];

    case "rejected":
      return [
        "This request was rejected -- review the reason and revise before regenerating if still needed.",
      ];

    default:
      return [];
  }
};

export { getSuggestedNextSteps };
