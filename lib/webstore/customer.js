import { Customer } from "@/models/user/Customer";

export const getCustomer = async ({ customerData }) => {
  const { email, name, surname, address } = customerData;
  return await Customer.findOne({ email }) ?? new Customer({ email, name, surname, address });
};
