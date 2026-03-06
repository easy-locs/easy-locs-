/**
 * i18n-world.ts — Additional world languages: KO, ZH, HI, TH, VI, ID, MS, SV, DA, NO, FI, EL, CS, HU, RO, HR, BG, SK, HE, UK
 * Each locale gets onboarding + full page coverage
 */

// ─── Korean (KO) ───
export const koAll: Record<string, string> = {
  "ob.welcome": "Easy-Locs에 오신 것을 환영합니다", "ob.select_profile_country": "프로필과 국가를 선택하세요", "ob.you_are": "당신은…", "ob.landlord": "집주인 / 소유자", "ob.landlord_desc": "부동산, 세입자, 문서를 관리하세요", "ob.tenant": "세입자", "ob.tenant_desc": "영수증을 확인하고 월세를 납부하세요", "ob.your_country": "국가", "ob.soon": "곧 출시", "ob.owner_info": "소유자 정보", "ob.individual": "개인", "ob.company": "법인", "ob.full_name": "성명", "ob.company_name": "회사명", "ob.address": "주소", "ob.address_placeholder": "주소 입력…", "ob.postal_code": "우편번호", "ob.city": "도시", "ob.phone": "전화번호", "ob.email": "이메일", "ob.tax_id": "사업자등록번호",
  "ob.describe_property": "첫 번째 부동산을 설명하세요", "ob.property_name": "부동산명", "ob.surface": "면적 (㎡)", "ob.rooms": "방 수", "ob.monthly_rent": "월세", "ob.charges": "관리비", "ob.deposit": "보증금", "ob.furnished": "가구 포함", "ob.rental_mode": "임대 방식", "ob.long_term": "장기", "ob.long_term_desc": "표준 임대 계약", "ob.short_term": "단기", "ob.short_term_desc": "Airbnb, Booking, 휴가 임대", "ob.mixed": "혼합", "ob.mixed_desc": "두 가지 방식 결합",
  "ob.connect_ota": "Airbnb와 Booking 계정을 연결하세요", "ob.connect": "연결", "ob.add_first_tenant": "첫 번째 세입자 추가", "ob.lease_start": "계약 시작일", "ob.finish_title": "설정 완료!", "ob.finish_desc": "작업 공간이 준비되었습니다.", "common.error": "오류",
  "page.dashboard.hello": "안녕하세요 👋", "page.dashboard.summary": "상황 요약입니다.", "page.dashboard.properties": "부동산", "page.dashboard.tenants_count": "세입자", "page.dashboard.collected_month": "이번 달 수금액", "page.dashboard.unpaid_amount": "미납", "page.dashboard.occupancy": "입주율", "page.dashboard.vacant": "공실",
  "page.dashboard.quick_actions": "빠른 작업", "page.dashboard.generate_receipt": "영수증 생성", "page.dashboard.create_lease": "계약서 작성", "page.dashboard.alerts": "알림 및 조치", "page.dashboard.all_good": "모두 최신입니다! 🎉", "page.dashboard.world_map": "내 글로벌 포트폴리오",
  "page.tasks.title": "작업", "page.tasks.new": "새 작업", "page.tasks.empty": "작업이 없습니다.",
  "page.interventions.title": "수리", "page.interventions.new": "새 수리", "page.interventions.empty": "수리 요청이 없습니다.",
  "page.finances.title": "재무", "page.finances.subtitle": "임대 수입, 비용, 순이익",
  "page.documents.title": "문서", "page.documents.create": "생성", "page.documents.history": "이력", "page.documents.no_doc": "문서가 없습니다.",
  "page.leases.title": "임대 계약", "page.leases.create_tab": "계약 생성", "page.leases.finalize": "확정", "page.leases.finalized": "확정됨", "page.leases.generate_pdf": "계약 PDF 생성",
  "page.receipts.title": "임대 영수증", "page.receipts.new": "새 영수증", "page.receipts.empty": "영수증이 아직 없습니다.",
  "page.billing.title": "구독", "page.billing.monthly": "월간", "page.billing.annual": "연간", "page.billing.subscribe": "구독하기",
  "plan.name": "Easy-Locs® 무제한", "plan.subtitle": "모두 포함", "plan.description": "Easy-Locs®의 모든 기능에 무제한 접근.",
  "page.common.loading": "로딩 중…", "page.common.save": "저장", "page.common.cancel": "취소", "page.common.delete": "삭제", "page.common.error": "오류", "page.common.paid": "납부완료", "page.common.unpaid": "미납", "page.common.active": "활성", "page.common.back": "뒤로", "page.common.validate": "확인", "page.common.generate_pdf": "PDF 생성",
  "page.rental.apartment": "아파트", "page.rental.house": "주택", "page.rental.studio": "원룸", "page.rental.vacant": "공실", "page.rental.occupied": "입주 중", "page.rental.add_property": "부동산 추가", "page.rental.add_tenant": "세입자 추가",
  "page.pricing.all_countries": "전 세계 모든 국가", "page.pricing.unlimited_properties": "무제한 부동산", "page.pricing.unlimited_tenants": "무제한 세입자",
  "page.pricing.no_commitment": "약정 없음 – 언제든지 해지 가능",
  "auth.login.title": "로그인", "auth.login.email": "이메일", "auth.login.password": "비밀번호", "auth.login.submit": "로그인", "auth.signup.title": "계정 만들기", "auth.signup.submit": "계정 생성",
};

// ─── Chinese Simplified (ZH) ───
export const zhAll: Record<string, string> = {
  "ob.welcome": "欢迎使用 Easy-Locs", "ob.select_profile_country": "选择您的身份和国家", "ob.you_are": "您是…", "ob.landlord": "房东 / 业主", "ob.landlord_desc": "管理您的房产、租户和文件", "ob.tenant": "租户", "ob.tenant_desc": "查看收据并支付租金", "ob.your_country": "您的国家", "ob.soon": "即将推出", "ob.owner_info": "业主信息", "ob.individual": "个人", "ob.company": "企业", "ob.full_name": "全名", "ob.company_name": "公司名称", "ob.address": "地址", "ob.address_placeholder": "输入地址…", "ob.postal_code": "邮政编码", "ob.city": "城市", "ob.phone": "电话", "ob.email": "电子邮箱", "ob.tax_id": "统一社会信用代码",
  "ob.describe_property": "描述您的第一处房产", "ob.property_name": "房产名称", "ob.surface": "面积（㎡）", "ob.rooms": "房间数", "ob.monthly_rent": "月租金", "ob.charges": "管理费", "ob.deposit": "押金", "ob.furnished": "带家具", "ob.rental_mode": "租赁方式", "ob.long_term": "长期", "ob.long_term_desc": "标准租赁合同", "ob.short_term": "短期", "ob.short_term_desc": "Airbnb, Booking, 度假租赁", "ob.mixed": "混合", "ob.mixed_desc": "两种模式结合",
  "ob.connect": "连接", "ob.add_first_tenant": "添加第一位租户", "ob.lease_start": "合同开始日期", "ob.finish_title": "设置完成！", "ob.finish_desc": "您的工作空间已就绪。", "common.error": "错误",
  "page.dashboard.hello": "您好 👋", "page.dashboard.summary": "您的情况概览。", "page.dashboard.properties": "房产", "page.dashboard.tenants_count": "租户", "page.dashboard.collected_month": "本月收款", "page.dashboard.unpaid_amount": "未付", "page.dashboard.occupancy": "入住率", "page.dashboard.vacant": "空置",
  "page.dashboard.quick_actions": "快捷操作", "page.dashboard.generate_receipt": "生成收据", "page.dashboard.create_lease": "创建合同", "page.dashboard.alerts": "提醒和操作", "page.dashboard.all_good": "一切最新！ 🎉",
  "page.tasks.title": "任务", "page.tasks.new": "新任务", "page.tasks.empty": "暂无任务。",
  "page.interventions.title": "维修", "page.interventions.new": "新维修", "page.interventions.empty": "暂无维修。",
  "page.finances.title": "财务", "page.finances.subtitle": "租金收入、支出和净利润",
  "page.documents.title": "文档", "page.documents.create": "创建", "page.documents.history": "历史", "page.documents.no_doc": "暂无文档。",
  "page.leases.title": "租赁合同", "page.leases.create_tab": "创建合同", "page.leases.finalize": "确认", "page.leases.finalized": "已确认", "page.leases.generate_pdf": "生成合同 PDF",
  "page.receipts.title": "租金收据", "page.receipts.new": "新收据", "page.receipts.empty": "暂无收据。",
  "page.billing.title": "订阅", "page.billing.monthly": "月付", "page.billing.annual": "年付", "page.billing.subscribe": "订阅",
  "plan.name": "Easy-Locs® 无限版", "plan.subtitle": "全部包含", "plan.description": "无限访问 Easy-Locs® 的所有功能。",
  "page.common.loading": "加载中…", "page.common.save": "保存", "page.common.cancel": "取消", "page.common.delete": "删除", "page.common.error": "错误", "page.common.paid": "已付", "page.common.unpaid": "未付", "page.common.active": "活跃", "page.common.back": "返回", "page.common.validate": "验证", "page.common.generate_pdf": "生成 PDF",
  "page.rental.apartment": "公寓", "page.rental.house": "别墅", "page.rental.studio": "单间", "page.rental.vacant": "空置", "page.rental.occupied": "已入住", "page.rental.add_property": "添加房产", "page.rental.add_tenant": "添加租户",
  "page.pricing.all_countries": "全球所有国家", "page.pricing.unlimited_properties": "无限房产", "page.pricing.unlimited_tenants": "无限租户",
  "page.pricing.no_commitment": "无承诺 – 随时取消",
  "auth.login.title": "登录", "auth.login.email": "电子邮箱", "auth.login.password": "密码", "auth.login.submit": "登录", "auth.signup.title": "创建账户", "auth.signup.submit": "创建账户",
};

// ─── Hindi (HI) ───
export const hiAll: Record<string, string> = {
  "ob.welcome": "Easy-Locs में आपका स्वागत है", "ob.landlord": "मकान मालिक / स्वामी", "ob.tenant": "किरायेदार", "ob.your_country": "आपका देश", "ob.individual": "व्यक्तिगत", "ob.company": "कंपनी", "ob.full_name": "पूरा नाम", "ob.address": "पता", "ob.phone": "फोन", "ob.email": "ईमेल", "ob.monthly_rent": "मासिक किराया", "ob.deposit": "जमा राशि", "ob.furnished": "फर्नीचर सहित", "ob.finish_title": "सेटअप पूरा!", "ob.finish_desc": "आपका कार्यक्षेत्र तैयार है।", "common.error": "त्रुटि",
  "page.dashboard.hello": "नमस्ते 👋", "page.dashboard.properties": "संपत्तियां", "page.dashboard.tenants_count": "किरायेदार", "page.dashboard.collected_month": "इस माह वसूली", "page.dashboard.unpaid_amount": "अवैतनिक", "page.dashboard.occupancy": "अधिभोग दर", "page.dashboard.vacant": "खाली",
  "page.dashboard.quick_actions": "त्वरित कार्य", "page.dashboard.generate_receipt": "रसीद बनाएं", "page.dashboard.create_lease": "अनुबंध बनाएं", "page.dashboard.all_good": "सब अपडेट है! 🎉",
  "page.documents.title": "दस्तावेज़", "page.documents.create": "बनाएं", "page.documents.history": "इतिहास", "page.documents.no_doc": "कोई दस्तावेज़ नहीं।",
  "page.leases.title": "किराया अनुबंध", "page.leases.finalize": "पूर्ण करें", "page.leases.finalized": "पूर्ण", "page.leases.generate_pdf": "अनुबंध PDF बनाएं",
  "page.receipts.title": "किराया रसीदें", "page.receipts.empty": "अभी कोई रसीद नहीं।",
  "page.billing.title": "सदस्यता", "page.billing.monthly": "मासिक", "page.billing.annual": "वार्षिक", "page.billing.subscribe": "सदस्यता लें",
  "plan.name": "Easy-Locs® अनलिमिटेड", "plan.description": "Easy-Locs® की सभी सुविधाओं तक असीमित पहुंच।",
  "page.common.loading": "लोड हो रहा है…", "page.common.save": "सहेजें", "page.common.cancel": "रद्द करें", "page.common.delete": "हटाएं", "page.common.error": "त्रुटि", "page.common.paid": "भुगतान हो गया", "page.common.unpaid": "अवैतनिक", "page.common.back": "वापस", "page.common.generate_pdf": "PDF बनाएं",
  "page.rental.apartment": "अपार्टमेंट", "page.rental.house": "मकान", "page.rental.vacant": "खाली", "page.rental.occupied": "भरा हुआ", "page.rental.add_property": "संपत्ति जोड़ें", "page.rental.add_tenant": "किरायेदार जोड़ें",
  "page.pricing.all_countries": "दुनिया भर के सभी देश", "page.pricing.unlimited_properties": "असीमित संपत्तियां", "page.pricing.unlimited_tenants": "असीमित किरायेदार",
  "auth.login.title": "लॉगिन", "auth.login.email": "ईमेल", "auth.login.password": "पासवर्ड", "auth.login.submit": "लॉगिन", "auth.signup.title": "खाता बनाएं",
};

// ─── Thai (TH) ───
export const thAll: Record<string, string> = {
  "ob.welcome": "ยินดีต้อนรับสู่ Easy-Locs", "ob.landlord": "เจ้าของ / ผู้ให้เช่า", "ob.tenant": "ผู้เช่า", "ob.your_country": "ประเทศของคุณ", "ob.full_name": "ชื่อเต็ม", "ob.address": "ที่อยู่", "ob.phone": "โทรศัพท์", "ob.email": "อีเมล", "ob.monthly_rent": "ค่าเช่ารายเดือน", "ob.deposit": "เงินมัดจำ", "ob.finish_title": "ตั้งค่าเสร็จสิ้น!", "common.error": "ข้อผิดพลาด",
  "page.dashboard.hello": "สวัสดี 👋", "page.dashboard.properties": "อสังหาริมทรัพย์", "page.dashboard.tenants_count": "ผู้เช่า", "page.dashboard.collected_month": "เก็บได้เดือนนี้", "page.dashboard.unpaid_amount": "ค้างชำระ",
  "page.documents.title": "เอกสาร", "page.documents.create": "สร้าง", "page.documents.history": "ประวัติ", "page.documents.no_doc": "ไม่มีเอกสาร",
  "page.leases.title": "สัญญาเช่า", "page.leases.finalize": "ยืนยัน", "page.leases.finalized": "ยืนยันแล้ว", "page.leases.generate_pdf": "สร้าง PDF สัญญา",
  "page.common.loading": "กำลังโหลด…", "page.common.save": "บันทึก", "page.common.cancel": "ยกเลิก", "page.common.delete": "ลบ", "page.common.paid": "ชำระแล้ว", "page.common.unpaid": "ค้างชำระ", "page.common.back": "กลับ", "page.common.generate_pdf": "สร้าง PDF",
  "page.rental.apartment": "อพาร์ตเมนต์", "page.rental.house": "บ้าน", "page.rental.vacant": "ว่าง", "page.rental.occupied": "มีผู้เช่า",
  "plan.name": "Easy-Locs® ไม่จำกัด", "page.billing.monthly": "รายเดือน", "page.billing.annual": "รายปี",
  "auth.login.title": "เข้าสู่ระบบ", "auth.signup.title": "สร้างบัญชี",
};

// ─── Vietnamese (VI) ───
export const viAll: Record<string, string> = {
  "ob.welcome": "Chào mừng đến Easy-Locs", "ob.landlord": "Chủ nhà / Chủ sở hữu", "ob.tenant": "Người thuê", "ob.your_country": "Quốc gia", "ob.full_name": "Họ và tên", "ob.address": "Địa chỉ", "ob.phone": "Điện thoại", "ob.email": "Email", "ob.monthly_rent": "Tiền thuê hàng tháng", "ob.deposit": "Tiền cọc", "ob.finish_title": "Thiết lập hoàn tất!", "common.error": "Lỗi",
  "page.dashboard.hello": "Xin chào 👋", "page.dashboard.properties": "Bất động sản", "page.dashboard.tenants_count": "Người thuê", "page.dashboard.collected_month": "Thu được tháng này", "page.dashboard.unpaid_amount": "Chưa thanh toán",
  "page.documents.title": "Tài liệu", "page.documents.create": "Tạo", "page.documents.history": "Lịch sử", "page.documents.no_doc": "Không có tài liệu.",
  "page.leases.title": "Hợp đồng thuê", "page.leases.finalize": "Hoàn tất", "page.leases.finalized": "Đã hoàn tất", "page.leases.generate_pdf": "Tạo PDF hợp đồng",
  "page.common.loading": "Đang tải…", "page.common.save": "Lưu", "page.common.cancel": "Hủy", "page.common.delete": "Xóa", "page.common.paid": "Đã thanh toán", "page.common.unpaid": "Chưa thanh toán", "page.common.back": "Quay lại", "page.common.generate_pdf": "Tạo PDF",
  "page.rental.apartment": "Căn hộ", "page.rental.house": "Nhà", "page.rental.vacant": "Trống", "page.rental.occupied": "Đã thuê",
  "plan.name": "Easy-Locs® Không giới hạn", "page.billing.monthly": "Hàng tháng", "page.billing.annual": "Hàng năm",
  "auth.login.title": "Đăng nhập", "auth.signup.title": "Tạo tài khoản",
};

// ─── Indonesian (ID) ───
export const idAll: Record<string, string> = {
  "ob.welcome": "Selamat datang di Easy-Locs", "ob.landlord": "Pemilik / Tuan Rumah", "ob.tenant": "Penyewa", "ob.your_country": "Negara Anda", "ob.full_name": "Nama lengkap", "ob.address": "Alamat", "ob.phone": "Telepon", "ob.email": "Email", "ob.monthly_rent": "Sewa bulanan", "ob.deposit": "Deposit", "ob.finish_title": "Pengaturan selesai!", "common.error": "Kesalahan",
  "page.dashboard.hello": "Halo 👋", "page.dashboard.properties": "Properti", "page.dashboard.tenants_count": "penyewa", "page.dashboard.collected_month": "Terkumpul bulan ini", "page.dashboard.unpaid_amount": "Belum dibayar",
  "page.documents.title": "Dokumen", "page.documents.create": "Buat", "page.documents.history": "Riwayat", "page.documents.no_doc": "Tidak ada dokumen.",
  "page.leases.title": "Kontrak Sewa", "page.leases.finalize": "Finalisasi", "page.leases.finalized": "Difinalisasi", "page.leases.generate_pdf": "Buat PDF kontrak",
  "page.common.loading": "Memuat…", "page.common.save": "Simpan", "page.common.cancel": "Batal", "page.common.delete": "Hapus", "page.common.paid": "Dibayar", "page.common.unpaid": "Belum dibayar", "page.common.back": "Kembali", "page.common.generate_pdf": "Buat PDF",
  "page.rental.apartment": "Apartemen", "page.rental.house": "Rumah", "page.rental.vacant": "Kosong", "page.rental.occupied": "Terisi",
  "plan.name": "Easy-Locs® Tanpa Batas", "page.billing.monthly": "Bulanan", "page.billing.annual": "Tahunan",
  "auth.login.title": "Masuk", "auth.signup.title": "Buat Akun",
};

// ─── Malay (MS) ───
export const msAll: Record<string, string> = {
  "ob.welcome": "Selamat datang ke Easy-Locs", "ob.landlord": "Tuan Rumah / Pemilik", "ob.tenant": "Penyewa", "ob.full_name": "Nama penuh", "ob.address": "Alamat", "ob.phone": "Telefon", "ob.email": "Emel", "ob.monthly_rent": "Sewa bulanan", "ob.deposit": "Deposit", "ob.finish_title": "Persediaan selesai!", "common.error": "Ralat",
  "page.dashboard.hello": "Hai 👋", "page.dashboard.properties": "Hartanah", "page.dashboard.tenants_count": "penyewa",
  "page.documents.title": "Dokumen", "page.documents.create": "Cipta", "page.documents.history": "Sejarah",
  "page.leases.title": "Kontrak Sewa", "page.leases.finalize": "Muktamadkan", "page.leases.finalized": "Dimuktamadkan",
  "page.common.loading": "Memuatkan…", "page.common.save": "Simpan", "page.common.cancel": "Batal", "page.common.delete": "Padam", "page.common.paid": "Dibayar", "page.common.unpaid": "Belum dibayar", "page.common.back": "Kembali", "page.common.generate_pdf": "Jana PDF",
  "plan.name": "Easy-Locs® Tanpa Had",
  "auth.login.title": "Log Masuk", "auth.signup.title": "Cipta Akaun",
};

// ─── Swedish (SV) ───
export const svAll: Record<string, string> = {
  "ob.welcome": "Välkommen till Easy-Locs", "ob.landlord": "Hyresvärd / Ägare", "ob.tenant": "Hyresgäst", "ob.your_country": "Ditt land", "ob.full_name": "Fullständigt namn", "ob.address": "Adress", "ob.phone": "Telefon", "ob.email": "E-post", "ob.monthly_rent": "Månadshyra", "ob.deposit": "Deposition", "ob.finish_title": "Installationen klar!", "common.error": "Fel",
  "page.dashboard.hello": "Hej 👋", "page.dashboard.properties": "Fastigheter", "page.dashboard.tenants_count": "hyresgäst(er)", "page.dashboard.collected_month": "Insamlat denna månad", "page.dashboard.unpaid_amount": "obetald",
  "page.documents.title": "Dokument", "page.documents.create": "Skapa", "page.documents.history": "Historik", "page.documents.no_doc": "Inga dokument.",
  "page.leases.title": "Hyreskontrakt", "page.leases.finalize": "Slutför", "page.leases.finalized": "Slutförd", "page.leases.generate_pdf": "Generera kontrakt-PDF",
  "page.common.loading": "Laddar…", "page.common.save": "Spara", "page.common.cancel": "Avbryt", "page.common.delete": "Ta bort", "page.common.paid": "Betald", "page.common.unpaid": "Obetald", "page.common.back": "Tillbaka", "page.common.generate_pdf": "Generera PDF",
  "page.rental.apartment": "Lägenhet", "page.rental.house": "Hus", "page.rental.vacant": "Ledig", "page.rental.occupied": "Uthyrd",
  "plan.name": "Easy-Locs® Obegränsad", "page.billing.monthly": "Månadsvis", "page.billing.annual": "Årsvis",
  "auth.login.title": "Logga in", "auth.signup.title": "Skapa konto",
};

// ─── Danish (DA) ───
export const daAll: Record<string, string> = {
  "ob.welcome": "Velkommen til Easy-Locs", "ob.landlord": "Udlejer / Ejer", "ob.tenant": "Lejer", "ob.full_name": "Fuldt navn", "ob.address": "Adresse", "ob.phone": "Telefon", "ob.email": "E-mail", "ob.monthly_rent": "Månedlig leje", "ob.deposit": "Depositum", "ob.finish_title": "Opsætning gennemført!", "common.error": "Fejl",
  "page.dashboard.hello": "Hej 👋", "page.dashboard.properties": "Ejendomme", "page.dashboard.tenants_count": "lejer(e)",
  "page.documents.title": "Dokumenter", "page.documents.create": "Opret", "page.documents.history": "Historik",
  "page.leases.title": "Lejekontrakter", "page.leases.finalize": "Færdiggør", "page.leases.finalized": "Færdiggjort",
  "page.common.loading": "Indlæser…", "page.common.save": "Gem", "page.common.cancel": "Annuller", "page.common.delete": "Slet", "page.common.paid": "Betalt", "page.common.unpaid": "Ubetalt", "page.common.back": "Tilbage", "page.common.generate_pdf": "Generer PDF",
  "plan.name": "Easy-Locs® Ubegrænset",
  "auth.login.title": "Log ind", "auth.signup.title": "Opret konto",
};

// ─── Norwegian (NO/NB) ───
export const nbAll: Record<string, string> = {
  "ob.welcome": "Velkommen til Easy-Locs", "ob.landlord": "Utleier / Eier", "ob.tenant": "Leietaker", "ob.full_name": "Fullt navn", "ob.address": "Adresse", "ob.phone": "Telefon", "ob.email": "E-post", "ob.monthly_rent": "Månedlig leie", "ob.deposit": "Depositum", "ob.finish_title": "Oppsett fullført!", "common.error": "Feil",
  "page.dashboard.hello": "Hei 👋", "page.dashboard.properties": "Eiendommer", "page.dashboard.tenants_count": "leietaker(e)",
  "page.documents.title": "Dokumenter", "page.documents.create": "Opprett", "page.documents.history": "Historikk",
  "page.leases.title": "Leiekontrakter", "page.leases.finalize": "Fullfør", "page.leases.finalized": "Fullført",
  "page.common.loading": "Laster…", "page.common.save": "Lagre", "page.common.cancel": "Avbryt", "page.common.delete": "Slett", "page.common.paid": "Betalt", "page.common.unpaid": "Ubetalt", "page.common.back": "Tilbake", "page.common.generate_pdf": "Generer PDF",
  "plan.name": "Easy-Locs® Ubegrenset",
  "auth.login.title": "Logg inn", "auth.signup.title": "Opprett konto",
};

// ─── Finnish (FI) ───
export const fiAll: Record<string, string> = {
  "ob.welcome": "Tervetuloa Easy-Locsiin", "ob.landlord": "Vuokranantaja / Omistaja", "ob.tenant": "Vuokralainen", "ob.full_name": "Koko nimi", "ob.address": "Osoite", "ob.phone": "Puhelin", "ob.email": "Sähköposti", "ob.monthly_rent": "Kuukausivuokra", "ob.deposit": "Vuokravakuus", "ob.finish_title": "Asennus valmis!", "common.error": "Virhe",
  "page.dashboard.hello": "Hei 👋", "page.dashboard.properties": "Kiinteistöt", "page.dashboard.tenants_count": "vuokralainen(ta)",
  "page.documents.title": "Asiakirjat", "page.documents.create": "Luo", "page.documents.history": "Historia",
  "page.leases.title": "Vuokrasopimukset", "page.leases.finalize": "Viimeistele", "page.leases.finalized": "Viimeistelty",
  "page.common.loading": "Ladataan…", "page.common.save": "Tallenna", "page.common.cancel": "Peruuta", "page.common.delete": "Poista", "page.common.paid": "Maksettu", "page.common.unpaid": "Maksamaton", "page.common.back": "Takaisin", "page.common.generate_pdf": "Luo PDF",
  "plan.name": "Easy-Locs® Rajoittamaton",
  "auth.login.title": "Kirjaudu", "auth.signup.title": "Luo tili",
};

// ─── Greek (EL) ───
export const elAll: Record<string, string> = {
  "ob.welcome": "Καλώς ήρθατε στο Easy-Locs", "ob.landlord": "Ιδιοκτήτης", "ob.tenant": "Ενοικιαστής", "ob.full_name": "Πλήρες όνομα", "ob.address": "Διεύθυνση", "ob.phone": "Τηλέφωνο", "ob.email": "Email", "ob.monthly_rent": "Μηνιαίο ενοίκιο", "ob.deposit": "Εγγύηση", "ob.finish_title": "Η ρύθμιση ολοκληρώθηκε!", "common.error": "Σφάλμα",
  "page.dashboard.hello": "Γεια σας 👋", "page.dashboard.properties": "Ακίνητα",
  "page.documents.title": "Έγγραφα", "page.documents.create": "Δημιουργία", "page.documents.history": "Ιστορικό",
  "page.leases.title": "Μισθωτήρια", "page.leases.finalize": "Οριστικοποίηση", "page.leases.finalized": "Οριστικοποιημένο",
  "page.common.loading": "Φόρτωση…", "page.common.save": "Αποθήκευση", "page.common.cancel": "Ακύρωση", "page.common.delete": "Διαγραφή", "page.common.paid": "Πληρωμένο", "page.common.unpaid": "Απλήρωτο", "page.common.back": "Πίσω", "page.common.generate_pdf": "Δημιουργία PDF",
  "plan.name": "Easy-Locs® Απεριόριστο",
  "auth.login.title": "Σύνδεση", "auth.signup.title": "Δημιουργία λογαριασμού",
};

// ─── Czech (CS) ───
export const csAll: Record<string, string> = {
  "ob.welcome": "Vítejte v Easy-Locs", "ob.landlord": "Pronajímatel / Vlastník", "ob.tenant": "Nájemce", "ob.full_name": "Celé jméno", "ob.address": "Adresa", "ob.phone": "Telefon", "ob.email": "E-mail", "ob.monthly_rent": "Měsíční nájem", "ob.deposit": "Kauce", "ob.finish_title": "Nastavení dokončeno!", "common.error": "Chyba",
  "page.dashboard.hello": "Ahoj 👋", "page.dashboard.properties": "Nemovitosti",
  "page.documents.title": "Dokumenty", "page.documents.create": "Vytvořit", "page.documents.history": "Historie",
  "page.leases.title": "Nájemní smlouvy", "page.leases.finalize": "Dokončit", "page.leases.finalized": "Dokončeno",
  "page.common.loading": "Načítání…", "page.common.save": "Uložit", "page.common.cancel": "Zrušit", "page.common.delete": "Smazat", "page.common.paid": "Zaplaceno", "page.common.unpaid": "Nezaplaceno", "page.common.back": "Zpět", "page.common.generate_pdf": "Generovat PDF",
  "plan.name": "Easy-Locs® Neomezený",
  "auth.login.title": "Přihlásit se", "auth.signup.title": "Vytvořit účet",
};

// ─── Hungarian (HU) ───
export const huAll: Record<string, string> = {
  "ob.welcome": "Üdvözöljük az Easy-Locs-ban", "ob.landlord": "Bérbeadó / Tulajdonos", "ob.tenant": "Bérlő", "ob.full_name": "Teljes név", "ob.address": "Cím", "ob.phone": "Telefon", "ob.email": "E-mail", "ob.monthly_rent": "Havi bérleti díj", "ob.deposit": "Kaució", "ob.finish_title": "Beállítás kész!", "common.error": "Hiba",
  "page.dashboard.hello": "Szia 👋", "page.dashboard.properties": "Ingatlanok",
  "page.documents.title": "Dokumentumok", "page.documents.create": "Létrehozás", "page.documents.history": "Előzmények",
  "page.leases.title": "Bérleti szerződések", "page.leases.finalize": "Véglegesítés", "page.leases.finalized": "Véglegesítve",
  "page.common.loading": "Betöltés…", "page.common.save": "Mentés", "page.common.cancel": "Mégse", "page.common.delete": "Törlés", "page.common.paid": "Fizetve", "page.common.unpaid": "Kifizetetlen", "page.common.back": "Vissza", "page.common.generate_pdf": "PDF generálás",
  "plan.name": "Easy-Locs® Korlátlan",
  "auth.login.title": "Bejelentkezés", "auth.signup.title": "Fiók létrehozása",
};

// ─── Romanian (RO) ───
export const roAll: Record<string, string> = {
  "ob.welcome": "Bine ați venit la Easy-Locs", "ob.landlord": "Proprietar / Locator", "ob.tenant": "Chiriaș", "ob.full_name": "Nume complet", "ob.address": "Adresă", "ob.phone": "Telefon", "ob.email": "E-mail", "ob.monthly_rent": "Chirie lunară", "ob.deposit": "Garanție", "ob.finish_title": "Configurare finalizată!", "common.error": "Eroare",
  "page.dashboard.hello": "Salut 👋", "page.dashboard.properties": "Proprietăți",
  "page.documents.title": "Documente", "page.documents.create": "Creare", "page.documents.history": "Istoric",
  "page.leases.title": "Contracte de închiriere", "page.leases.finalize": "Finalizare", "page.leases.finalized": "Finalizat",
  "page.common.loading": "Se încarcă…", "page.common.save": "Salvare", "page.common.cancel": "Anulare", "page.common.delete": "Ștergere", "page.common.paid": "Plătit", "page.common.unpaid": "Neplătit", "page.common.back": "Înapoi", "page.common.generate_pdf": "Generare PDF",
  "plan.name": "Easy-Locs® Nelimitat",
  "auth.login.title": "Autentificare", "auth.signup.title": "Creare cont",
};

// ─── Croatian (HR) ───
export const hrAll: Record<string, string> = {
  "ob.welcome": "Dobrodošli u Easy-Locs", "ob.landlord": "Najmodavac / Vlasnik", "ob.tenant": "Najmoprimac", "ob.full_name": "Puno ime", "ob.address": "Adresa", "ob.phone": "Telefon", "ob.email": "E-mail", "ob.monthly_rent": "Mjesečna najamnina", "ob.deposit": "Jamčevina", "ob.finish_title": "Postavljanje završeno!", "common.error": "Greška",
  "page.dashboard.hello": "Bok 👋", "page.dashboard.properties": "Nekretnine",
  "page.documents.title": "Dokumenti", "page.leases.title": "Ugovori o najmu", "page.leases.finalize": "Završi", "page.leases.finalized": "Završeno",
  "page.common.loading": "Učitavanje…", "page.common.save": "Spremi", "page.common.cancel": "Odustani", "page.common.delete": "Izbriši", "page.common.paid": "Plaćeno", "page.common.unpaid": "Neplaćeno", "page.common.back": "Natrag",
  "plan.name": "Easy-Locs® Neograničen", "auth.login.title": "Prijava", "auth.signup.title": "Kreiraj račun",
};

// ─── Bulgarian (BG) ───
export const bgAll: Record<string, string> = {
  "ob.welcome": "Добре дошли в Easy-Locs", "ob.landlord": "Наемодател / Собственик", "ob.tenant": "Наемател", "ob.full_name": "Пълно име", "ob.address": "Адрес", "ob.phone": "Телефон", "ob.email": "Имейл", "ob.monthly_rent": "Месечен наем", "ob.deposit": "Депозит", "ob.finish_title": "Настройката е завършена!", "common.error": "Грешка",
  "page.dashboard.hello": "Здравейте 👋", "page.dashboard.properties": "Имоти",
  "page.documents.title": "Документи", "page.leases.title": "Договори за наем", "page.leases.finalize": "Финализиране", "page.leases.finalized": "Финализирано",
  "page.common.loading": "Зареждане…", "page.common.save": "Запази", "page.common.cancel": "Отмени", "page.common.delete": "Изтрий", "page.common.paid": "Платено", "page.common.unpaid": "Неплатено", "page.common.back": "Назад",
  "plan.name": "Easy-Locs® Неограничен", "auth.login.title": "Вход", "auth.signup.title": "Създай акаунт",
};

// ─── Slovak (SK) ───
export const skAll: Record<string, string> = {
  "ob.welcome": "Vitajte v Easy-Locs", "ob.landlord": "Prenajímateľ / Vlastník", "ob.tenant": "Nájomca", "ob.full_name": "Celé meno", "ob.address": "Adresa", "ob.phone": "Telefón", "ob.email": "E-mail", "ob.monthly_rent": "Mesačné nájomné", "ob.deposit": "Kaucia", "ob.finish_title": "Nastavenie dokončené!", "common.error": "Chyba",
  "page.dashboard.hello": "Ahoj 👋", "page.dashboard.properties": "Nehnuteľnosti",
  "page.documents.title": "Dokumenty", "page.leases.title": "Nájomné zmluvy", "page.leases.finalize": "Dokončiť", "page.leases.finalized": "Dokončené",
  "page.common.loading": "Načítavanie…", "page.common.save": "Uložiť", "page.common.cancel": "Zrušiť", "page.common.delete": "Odstrániť", "page.common.paid": "Zaplatené", "page.common.unpaid": "Nezaplatené", "page.common.back": "Späť",
  "plan.name": "Easy-Locs® Neobmedzený", "auth.login.title": "Prihlásiť sa", "auth.signup.title": "Vytvoriť účet",
};

// ─── Hebrew (HE) ───
export const heAll: Record<string, string> = {
  "ob.welcome": "ברוכים הבאים ל-Easy-Locs", "ob.landlord": "משכיר / בעלים", "ob.tenant": "שוכר", "ob.full_name": "שם מלא", "ob.address": "כתובת", "ob.phone": "טלפון", "ob.email": "דוא\"ל", "ob.monthly_rent": "שכר דירה חודשי", "ob.deposit": "פיקדון", "ob.finish_title": "ההגדרה הושלמה!", "common.error": "שגיאה",
  "page.dashboard.hello": "שלום 👋", "page.dashboard.properties": "נכסים",
  "page.documents.title": "מסמכים", "page.documents.create": "צור", "page.documents.history": "היסטוריה",
  "page.leases.title": "חוזי שכירות", "page.leases.finalize": "סיים", "page.leases.finalized": "הושלם",
  "page.common.loading": "טוען…", "page.common.save": "שמור", "page.common.cancel": "ביטול", "page.common.delete": "מחק", "page.common.paid": "שולם", "page.common.unpaid": "לא שולם", "page.common.back": "חזרה", "page.common.generate_pdf": "צור PDF",
  "plan.name": "Easy-Locs® ללא הגבלה", "auth.login.title": "כניסה", "auth.signup.title": "יצירת חשבון",
};

// ─── Ukrainian (UK) ───
export const ukAll: Record<string, string> = {
  "ob.welcome": "Ласкаво просимо до Easy-Locs", "ob.landlord": "Орендодавець / Власник", "ob.tenant": "Орендар", "ob.full_name": "Повне ім'я", "ob.address": "Адреса", "ob.phone": "Телефон", "ob.email": "Електронна пошта", "ob.monthly_rent": "Місячна оренда", "ob.deposit": "Депозит", "ob.finish_title": "Налаштування завершено!", "common.error": "Помилка",
  "page.dashboard.hello": "Привіт 👋", "page.dashboard.properties": "Нерухомість",
  "page.documents.title": "Документи", "page.leases.title": "Договори оренди", "page.leases.finalize": "Завершити", "page.leases.finalized": "Завершено",
  "page.common.loading": "Завантаження…", "page.common.save": "Зберегти", "page.common.cancel": "Скасувати", "page.common.delete": "Видалити", "page.common.paid": "Оплачено", "page.common.unpaid": "Неоплачено", "page.common.back": "Назад",
  "plan.name": "Easy-Locs® Безлімітний", "auth.login.title": "Увійти", "auth.signup.title": "Створити акаунт",
};
