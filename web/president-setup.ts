export function presidentNameFields(prefix: string) {
  return `<fieldset class="president-name-fields"><legend>Your president</legend><div class="president-name-grid"><label for="${prefix}-first-name">First name<input id="${prefix}-first-name" name="firstName" type="text" autocomplete="given-name" required maxlength="60" placeholder="First name"></label><label for="${prefix}-last-name">Last name<input id="${prefix}-last-name" name="lastName" type="text" autocomplete="family-name" required maxlength="60" placeholder="Last name"></label></div></fieldset>`;
}

export function presidentFromForm(form: HTMLFormElement) {
  const values = new FormData(form);
  return { firstName: values.get('firstName'), lastName: values.get('lastName') };
}
