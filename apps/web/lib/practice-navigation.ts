interface BuildPracticeHrefInput {
  scenarioId?: string;
  roleId?: string;
  mode?: string;
  returnTo?: string;
}

export function buildPracticeHref(input: BuildPracticeHrefInput) {
  const searchParams = new URLSearchParams();

  if (input.scenarioId) {
    searchParams.set("scenarioId", input.scenarioId);
  }

  if (input.roleId) {
    searchParams.set("roleId", input.roleId);
  }

  if (input.mode) {
    searchParams.set("mode", input.mode);
  }

  if (input.returnTo) {
    searchParams.set("returnTo", input.returnTo);
  }

  const query = searchParams.toString();

  return query ? `/practice?${query}` : "/practice";
}
