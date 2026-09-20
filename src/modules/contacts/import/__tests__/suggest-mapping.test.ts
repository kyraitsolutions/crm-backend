import { IMPORT_FIELD_TARGET } from "../constants/import.constant.js";
import { suggestMapping } from "../http/suggest-mapping.js";

describe("suggestMapping", () => {
  it.each([
    ["Phone", IMPORT_FIELD_TARGET.PHONE],
    ["mobile", IMPORT_FIELD_TARGET.PHONE],
    ["mobile number", IMPORT_FIELD_TARGET.PHONE],
    ["phone number", IMPORT_FIELD_TARGET.PHONE],
    ["WhatsApp", IMPORT_FIELD_TARGET.PHONE],
    ["whatsapp number", IMPORT_FIELD_TARGET.PHONE],
    ["Email", IMPORT_FIELD_TARGET.EMAIL],
    ["e-mail", IMPORT_FIELD_TARGET.EMAIL],
    ["email address", IMPORT_FIELD_TARGET.EMAIL],
    ["Full Name", IMPORT_FIELD_TARGET.NAME],
    ["tags", IMPORT_FIELD_TARGET.TAGS],
    ["status", IMPORT_FIELD_TARGET.STATUS],
    ["opt in", IMPORT_FIELD_TARGET.WHATSAPP_OPT_IN],
    ["notes", IMPORT_FIELD_TARGET.IGNORE],
  ])("maps %s", (header, target) => {
    expect(suggestMapping([header])).toEqual([{ source: header, target }]);
  });

  it("does not treat unrelated headers as phone via the tel substring", () => {
    expect(suggestMapping(["hotel"])).toEqual([{ source: "hotel", target: IMPORT_FIELD_TARGET.IGNORE }]);
  });

  it("assigns each target at most once", () => {
    const mapped = suggestMapping(["phone", "mobile", "email"]);
    expect(mapped).toEqual([
      { source: "phone", target: IMPORT_FIELD_TARGET.PHONE },
      { source: "mobile", target: IMPORT_FIELD_TARGET.IGNORE },
      { source: "email", target: IMPORT_FIELD_TARGET.EMAIL },
    ]);
  });
});
