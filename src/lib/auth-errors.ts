/**
 * Thông báo cho mã lỗi NextAuth trả về trang đăng nhập (`/login?error=...`). Trước đây trang không đọc tham số này
 * nên khách bấm "Đăng nhập với Google" bị lỗi chỉ thấy quay lại form, không biết vì sao.
 */
const MESSAGES: Record<string, string> = {
  // Email trùng tài khoản khách giờ được liên kết tự động (lib/auth-google.ts); lỗi này chỉ còn khi đang đăng nhập
  // một tài khoản mà tài khoản Google lại đã gắn với tài khoản khác.
  OAuthAccountNotLinked: 'Tài khoản Google này đang gắn với một tài khoản T\'Petie khác. Mẹ đăng xuất rồi bấm "Đăng nhập với Google" lại nhé.',
  GoogleStaffAccount: 'Tài khoản quản trị và nhân viên đăng nhập bằng tên đăng nhập (hoặc email) và mật khẩu.',
  AccessDenied: 'Tài khoản này đang bị khóa hoặc email Google chưa được xác minh. Mẹ liên hệ shop để được hỗ trợ.',
  OAuthSignin: 'Chưa mở được trang đăng nhập Google. Mẹ thử lại sau ít phút nhé.',
  OAuthCallback: 'Google chưa xác nhận được lần đăng nhập này (có thể do quá thời gian). Mẹ bấm đăng nhập lại nhé.',
  OAuthCreateAccount: 'Chưa tạo được tài khoản từ Google. Mẹ thử lại hoặc đăng ký bằng email.',
  Callback: 'Đăng nhập bằng Google chưa hoàn tất. Mẹ thử lại nhé.',
  Configuration: 'Đăng nhập bằng Google đang tạm gián đoạn. Mẹ đăng nhập bằng email và mật khẩu giúp shop nhé.',
  SessionRequired: 'Mẹ đăng nhập để tiếp tục nhé.',
  CredentialsSignin: 'Tên đăng nhập, email hoặc mật khẩu không đúng.',
};

export function authErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return MESSAGES[code] || 'Đăng nhập chưa thành công. Mẹ thử lại nhé.';
}
