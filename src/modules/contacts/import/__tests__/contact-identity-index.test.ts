import { Types } from "mongoose";
import { MongoServerError } from "mongodb";
import { ContactModel } from "../../../../models/contact.model.js";
import {
  resetImportCollections,
  startImportTestMongo,
  stopImportTestMongo,
} from "./mongo-test-env.js";

describe("contact identity indexes", () => {
  beforeAll(async () => {
    await startImportTestMongo();
  }, 120_000);

  afterAll(async () => {
    await stopImportTestMongo();
  });

  beforeEach(async () => {
    await resetImportCollections();
  });

  it("rejects a duplicate email in the same workspace", async () => {
    const accountId = new Types.ObjectId();
    await ContactModel.create({
      accountId,
      name: "Ada",
      email: "ada@kyra.test",
      source: "import",
    });
    await expect(
      ContactModel.create({
        accountId,
        name: "Ada 2",
        email: "ada@kyra.test",
        source: "import",
      }),
    ).rejects.toBeInstanceOf(MongoServerError);
  });

  it("allows the same email in another workspace", async () => {
    await ContactModel.create({
      accountId: new Types.ObjectId(),
      name: "Ada",
      email: "ada@kyra.test",
      source: "import",
    });
    const other = await ContactModel.create({
      accountId: new Types.ObjectId(),
      name: "Ada",
      email: "ada@kyra.test",
      source: "import",
    });
    expect(other.email).toBe("ada@kyra.test");
  });

  it("rejects a duplicate phone in the same workspace", async () => {
    const accountId = new Types.ObjectId();
    await ContactModel.create({
      accountId,
      name: "Ada",
      phone: "+919876543210",
      source: "import",
    });
    await expect(
      ContactModel.create({
        accountId,
        name: "Ada 2",
        phone: "+919876543210",
        source: "import",
      }),
    ).rejects.toBeInstanceOf(MongoServerError);
  });

  it("allows the same phone in another workspace", async () => {
    await ContactModel.create({
      accountId: new Types.ObjectId(),
      name: "Ada",
      phone: "+919876543210",
      source: "import",
    });
    const other = await ContactModel.create({
      accountId: new Types.ObjectId(),
      name: "Ada",
      phone: "+919876543210",
      source: "import",
    });
    expect(other.phone).toBe("+919876543210");
  });
});
