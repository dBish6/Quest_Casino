import type { ActionFunction } from "react-router-dom";
import type { LocaleData } from "@typings/Locale";

import { redirect } from "react-router-dom";
import { LANGUAGES, AVATAR_FILE_EXTENSIONS } from "@qc/constants";
import { logger, validateEmail } from "@qc/utils";

const optionalFields = new Set(["region", "calling_code", "phone_number"]); // For anything other then profile.

/**
 * Validates form fields in user forms (register, update profile, reset password, forgot password).
 */
const validateUserAction: ActionFunction = async ({ request }) => {
  try {
    const formData = await request.formData(),
      result = await validate(formData);

    if (Object.keys(result.errors).length) return Response.json({ errors: result.errors }, { status: 400 });
    else return Response.json({ reqBody: result.reqBody }, { status: 200 });
  } catch (error: any) {
    logger.error("validateUser error:\n", error.message);
    return Response.json({ ERROR: error.message }, { status: 500 });
  }
};
export default validateUserAction;

async function validate(formData: FormData) {
  const botField = formData.get("bot");
  if (botField && botField.toString().length) return { errors: { bot: "Access Denied" } };
  formData.delete("bot");

  const lang = formData.get("lang")?.toString();
  if (!LANGUAGES[lang || ""]) return { errors: { lang: "Access Denied" } };

  const localeData = (await import(`../../../locales/${lang}.json`)).default as LocaleData,
    localeContent = localeData.api.action.validateUser;
  formData.delete("lang");

  const isProfile = formData.get("isProfile");
  formData.delete("isProfile");

  const errors: Record<string, string> = {},
    reqBody: Record<string, string | { old: string, new: string }> = {};

  for (const [key, value] of formData.entries()) {
    if (key === "calling_code") continue;
    let fieldValue: string | File = value instanceof File ? value : value.toString();

    // @ts-ignore
    const label = localeData.general.form.user[key] || localeContent[key],
      isPassword = ["old_password", "new_password"].includes(key);

    if (fieldValue instanceof File) {
      // For avatar_url.
      if (key !== "avatar_url") errors[key] = localeContent.error.avatar_url[0]; // Should never happen.

      const errorMsg = validateField(localeContent.error, key, label, fieldValue, formData);
      if (errorMsg) errors.global = errorMsg;

      await transformFileToDataUrl(fieldValue)
        .then((fieldValue) => (reqBody.avatar_url = fieldValue))
        .catch(() => (errors.avatar_url = localeContent.error.avatar_url[1]));
    } else if (fieldValue.length) {
      if (key === "avatar_url") redirect("/error-403");

      const errorMsg = validateField(localeContent.error, key, label, fieldValue, formData);
      if (errorMsg) {
        if (errorMsg === "Passwords do not match.") {
          errors.password = errorMsg;
          errors.con_password = errorMsg;
        } else {
          errors[
            key === "phone_number" && errorMsg.includes("calling code", -1) ? "calling_code" : key
          ] = errorMsg;
        }
      } else if (key !== "con_password" && !isPassword) {
        // Forms the correct request body.
        reqBody[key] = key === "phone_number" ? `${formData.get("calling_code")} ${fieldValue}` : fieldValue;
      }
    } else if (((isProfile && isPassword) || (!isProfile && !optionalFields.has(key)))) {
      errors[key] =
        key === "con_password"
          ? localeContent.error.con_password[0]
          : key === "old_password"
            ? localeContent.error.old_password
            : `${label} ${localeData.general.form.user.error.required}`;
    }
  }

  return { errors, reqBody };
}
function validateField(
  localeErrorObj: Record<string, any>,
  key: string,
  label: string,
  value: string | File,
  formData: FormData
) {
  switch (key) {
    case "avatar_url":
      return validateAvatar(localeErrorObj.avatar_url, value as File);
    case "username":
      return validateUsername(localeErrorObj.username, value as string);
    case "email":
      return validateEmail(value as string) ? null : localeErrorObj.email;
    case "password":
    case "new_password":
      return validatePassword(localeErrorObj.password, label, value as string);
    case "con_password":
      return confirmPassword(
        localeErrorObj.con_password,
        value as string,
        formData.get("password")!.toString()
      );
    case "phone_number":
      return validatePhoneNumber(
        localeErrorObj.phone_number,
        value as string,
        formData.get("calling_code")!.toString()
      );
    default:
      return null;
  }
}

/**
 * Constraints:
 * - Must be a jpg, png, or webp.
 * - Can't be greater than 500kb.
 */
function validateAvatar(localeError: string[], file: File) {
  if (!AVATAR_FILE_EXTENSIONS.has(file.type.split("/")[1]))
    return localeError[2];

  if (file.size > 500 * 1024) return localeError[3];
}

/**
 * Constraints:
 * - Min of 3 characters.
 * - Max of 24 characters.
 */
function validateUsername(localeError: string[], username: string) {
  if (username.length < 3) return localeError[0];
  else if (username.length > 24) return localeError[1];
}

/**
 * Constraints:
 * - Min of 6 characters.
 * - Max of 128 characters.
 * - At least one uppercase letter.
 * 
 * Also, checks their old password for password resets.
 */
function validatePassword(localeError: string[], label: string, password: string) {
  if (password.length < 6) return localeError[0].replace("{{name}}", label);
  else if (password.length > 128) return localeError[1];
  else if (!/[A-Z]/.test(password))
    return localeError[2].replace("{{name}}", label);
}
function confirmPassword(localeError: string[], conPassword: string, password: string) {
  if (conPassword !== password) return localeError[1];
}

/**
 * Constraints:
 * - Must be 14 characters because of the format.
 * - If a phone number is provided, the calling code is required.
 */
function validatePhoneNumber(localeError: string[], phoneNumber: string, callingCode: string) {
  if (phoneNumber.length !== 14) return localeError[0];
  else if (!callingCode.length) return localeError[1];
}

function transformFileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject();

    reader.readAsDataURL(file);
  });
}
