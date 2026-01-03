import { z } from "zod";

export const signUpSchema = z
  .object({
    name: z
      .string()
      .min(2, "이름은 2자 이상 입력해주세요")
      .max(50, "이름은 50자 이하로 입력해주세요"),
    email: z.email("올바른 이메일 형식이 아닙니다"),
    password: z
      .string()
      .min(8, "비밀번호는 8자 이상 입력해주세요")
      .regex(
        /^(?=.*[a-zA-Z])(?=.*\d)/,
        "비밀번호는 영문과 숫자를 포함해야 합니다",
      ),
    confirmPassword: z.string().min(1, "비밀번호 확인을 입력해주세요"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });

export type SignUpFormData = z.infer<typeof signUpSchema>;
