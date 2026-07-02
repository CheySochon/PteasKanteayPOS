import { createUserSchema } from "../src/schemas/user.schema.js";

const payload1 = {
  name: "Test User",
  email: "test@pos.local",
  password: "password123",
  roleName: "Staff",
  isActive: true,
};

const result1 = createUserSchema.safeParse(payload1);
console.log("Payload 1 Result:");
console.log("Success:", result1.success);
if (!result1.success) {
  console.log("Errors:", JSON.stringify(result1.error.format(), null, 2));
} else {
  console.log("Data:", JSON.stringify(result1.data, null, 2));
}
