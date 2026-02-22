export function isClinician(profile) {
  return profile?.role === "clinician";
}

export function isPatient(profile) {
  return profile?.role === "patient";
}
