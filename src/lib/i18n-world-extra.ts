/**
 * i18n-world-extra.ts — Missing tenant pay, payment, settings, signature, and accounting keys
 * for ALL 20 world languages + deepened coverage for the 11 core locales
 */

// Shared payment/tenant-pay keys per locale
const paymentKeys = {
  ko: {
    "page.tenant_pay.title": "결제", "page.tenant_pay.subtitle": "미납 임대료를 온라인으로 결제하세요",
    "page.tenant_pay.card_label": "카드", "page.tenant_pay.card_desc": "신용/직불카드 결제",
    "page.tenant_pay.sepa_label": "자동이체", "page.tenant_pay.sepa_desc": "은행 자동이체",
    "page.tenant_pay.transfer_label": "계좌이체", "page.tenant_pay.transfer_desc": "직접 은행 이체",
    "page.tenant_pay.method_title": "결제 수단 선택", "page.tenant_pay.toast_success": "결제 완료",
    "page.tenant_pay.toast_success_desc": "결제가 성공적으로 처리되었습니다.", "page.tenant_pay.toast_cancel": "결제 취소",
    "page.tenant_pay.toast_cancel_desc": "결제가 취소되었습니다.", "page.tenant_pay.toast_transfer": "은행 이체",
    "page.tenant_pay.toast_transfer_desc": "아래 정보로 이체해주세요.", "page.tenant_pay.transfer_info": "이체 정보",
    "page.tenant_pay.beneficiary": "수취인", "page.tenant_pay.transfer_help": "이체 시 참조번호를 포함해주세요.",
    "page.tenant_pay.transfer_ref": "참조: 임대료 + 기간", "page.tenant_pay.no_property": "연결된 부동산이 없습니다.",
    "page.tenant_pay.up_to_date": "완납", "page.tenant_pay.no_unpaid": "미납 임대료가 없습니다.",
    "page.tenant_pay.rent_line": "임대료", "page.tenant_pay.charges_line": "관리비",
    "page.tenant_pay.pay_btn": "결제", "page.tenant_pay.transfer_btn": "이체 확인",
    "page.tenant_pay.success_title": "결제 확인됨", "page.tenant_pay.success_desc": "결제가 확인되었습니다.",
    "page.settings.title": "설정", "page.settings.profile": "프로필", "page.settings.security": "보안",
    "page.settings.mfa": "2단계 인증", "page.settings.mfa_enable": "활성화", "page.settings.mfa_disable": "비활성화",
    "page.accounting.title": "회계", "page.accounting.revenue": "수입", "page.accounting.expenses": "지출", "page.accounting.net": "순이익",
    "page.signature.landlord": "임대인 서명", "page.signature.tenant": "임차인 서명", "page.signature.date": "서명 일자",
    "page.signature.place": "서명 장소", "page.signature.witness": "증인",
  },
  zh: {
    "page.tenant_pay.title": "支付", "page.tenant_pay.subtitle": "在线支付未付租金",
    "page.tenant_pay.card_label": "银行卡", "page.tenant_pay.card_desc": "信用卡/借记卡支付",
    "page.tenant_pay.sepa_label": "自动扣款", "page.tenant_pay.sepa_desc": "银行自动扣款",
    "page.tenant_pay.transfer_label": "银行转账", "page.tenant_pay.transfer_desc": "直接银行转账",
    "page.tenant_pay.method_title": "选择支付方式", "page.tenant_pay.toast_success": "支付成功",
    "page.tenant_pay.toast_success_desc": "支付已成功处理。", "page.tenant_pay.toast_cancel": "支付已取消",
    "page.tenant_pay.toast_cancel_desc": "支付已被取消。", "page.tenant_pay.toast_transfer": "银行转账",
    "page.tenant_pay.toast_transfer_desc": "请使用以下信息进行转账。", "page.tenant_pay.transfer_info": "转账信息",
    "page.tenant_pay.beneficiary": "收款人", "page.tenant_pay.transfer_help": "转账时请注明参考号。",
    "page.tenant_pay.transfer_ref": "参考: 租金 + 期间", "page.tenant_pay.no_property": "未关联房产。",
    "page.tenant_pay.up_to_date": "已缴清", "page.tenant_pay.no_unpaid": "没有未付租金。",
    "page.tenant_pay.rent_line": "租金", "page.tenant_pay.charges_line": "管理费",
    "page.tenant_pay.pay_btn": "支付", "page.tenant_pay.transfer_btn": "确认转账",
    "page.tenant_pay.success_title": "支付已确认", "page.tenant_pay.success_desc": "您的支付已确认。",
    "page.settings.title": "设置", "page.settings.profile": "个人资料", "page.settings.security": "安全",
    "page.settings.mfa": "双重认证", "page.settings.mfa_enable": "启用", "page.settings.mfa_disable": "禁用",
    "page.accounting.title": "会计", "page.accounting.revenue": "收入", "page.accounting.expenses": "支出", "page.accounting.net": "净利润",
    "page.signature.landlord": "出租方签名", "page.signature.tenant": "承租方签名", "page.signature.date": "签署日期",
    "page.signature.place": "签署地点", "page.signature.witness": "见证人",
  },
  hi: {
    "page.tenant_pay.title": "भुगतान", "page.tenant_pay.subtitle": "बकाया किराया ऑनलाइन चुकाएं",
    "page.tenant_pay.card_label": "कार्ड", "page.tenant_pay.card_desc": "क्रेडिट/डेबिट कार्ड",
    "page.tenant_pay.sepa_label": "ऑटो-डेबिट", "page.tenant_pay.sepa_desc": "बैंक ऑटो-डेबिट",
    "page.tenant_pay.transfer_label": "बैंक ट्रांसफर", "page.tenant_pay.transfer_desc": "सीधा बैंक ट्रांसफर",
    "page.tenant_pay.method_title": "भुगतान विधि चुनें", "page.tenant_pay.toast_success": "भुगतान सफल",
    "page.tenant_pay.toast_success_desc": "भुगतान सफलतापूर्वक संसाधित हुआ।", "page.tenant_pay.toast_cancel": "भुगतान रद्द",
    "page.tenant_pay.toast_cancel_desc": "भुगतान रद्द कर दिया गया।",
    "page.tenant_pay.no_property": "कोई संपत्ति जुड़ी नहीं है।",
    "page.tenant_pay.up_to_date": "सब चुकता", "page.tenant_pay.no_unpaid": "कोई बकाया किराया नहीं।",
    "page.tenant_pay.rent_line": "किराया", "page.tenant_pay.charges_line": "रखरखाव",
    "page.tenant_pay.pay_btn": "भुगतान करें", "page.tenant_pay.transfer_btn": "ट्रांसफर पुष्टि",
    "page.settings.title": "सेटिंग्स", "page.settings.profile": "प्रोफाइल", "page.settings.security": "सुरक्षा",
    "page.accounting.title": "लेखांकन", "page.accounting.revenue": "आय", "page.accounting.expenses": "व्यय", "page.accounting.net": "शुद्ध लाभ",
    "page.signature.landlord": "मकान मालिक हस्ताक्षर", "page.signature.tenant": "किरायेदार हस्ताक्षर", "page.signature.date": "हस्ताक्षर तिथि",
  },
  th: {
    "page.tenant_pay.title": "ชำระเงิน", "page.tenant_pay.subtitle": "ชำระค่าเช่าค้างจ่ายออนไลน์",
    "page.tenant_pay.card_label": "บัตร", "page.tenant_pay.card_desc": "บัตรเครดิต/เดบิต",
    "page.tenant_pay.transfer_label": "โอนเงิน", "page.tenant_pay.transfer_desc": "โอนผ่านธนาคาร",
    "page.tenant_pay.method_title": "เลือกวิธีชำระเงิน", "page.tenant_pay.toast_success": "ชำระสำเร็จ",
    "page.tenant_pay.no_property": "ไม่มีอสังหาริมทรัพย์เชื่อมต่อ",
    "page.tenant_pay.up_to_date": "ชำระครบแล้ว", "page.tenant_pay.no_unpaid": "ไม่มีค่าเช่าค้าง",
    "page.tenant_pay.rent_line": "ค่าเช่า", "page.tenant_pay.charges_line": "ค่าส่วนกลาง",
    "page.tenant_pay.pay_btn": "ชำระ", "page.settings.title": "การตั้งค่า",
    "page.accounting.title": "บัญชี", "page.accounting.revenue": "รายได้", "page.accounting.expenses": "รายจ่าย",
    "page.signature.landlord": "ลายเซ็นผู้ให้เช่า", "page.signature.tenant": "ลายเซ็นผู้เช่า", "page.signature.date": "วันที่ลงนาม",
  },
  vi: {
    "page.tenant_pay.title": "Thanh toán", "page.tenant_pay.subtitle": "Thanh toán tiền thuê trực tuyến",
    "page.tenant_pay.card_label": "Thẻ", "page.tenant_pay.card_desc": "Thẻ tín dụng/ghi nợ",
    "page.tenant_pay.transfer_label": "Chuyển khoản", "page.tenant_pay.transfer_desc": "Chuyển khoản ngân hàng",
    "page.tenant_pay.method_title": "Chọn phương thức thanh toán", "page.tenant_pay.toast_success": "Thanh toán thành công",
    "page.tenant_pay.no_property": "Không có bất động sản liên kết.",
    "page.tenant_pay.up_to_date": "Đã thanh toán hết", "page.tenant_pay.no_unpaid": "Không có tiền thuê chưa thanh toán.",
    "page.tenant_pay.rent_line": "Tiền thuê", "page.tenant_pay.charges_line": "Phí dịch vụ",
    "page.tenant_pay.pay_btn": "Thanh toán", "page.settings.title": "Cài đặt",
    "page.accounting.title": "Kế toán", "page.accounting.revenue": "Doanh thu", "page.accounting.expenses": "Chi phí",
    "page.signature.landlord": "Chữ ký bên cho thuê", "page.signature.tenant": "Chữ ký bên thuê", "page.signature.date": "Ngày ký",
  },
  id: {
    "page.tenant_pay.title": "Pembayaran", "page.tenant_pay.subtitle": "Bayar sewa yang belum dibayar secara online",
    "page.tenant_pay.card_label": "Kartu", "page.tenant_pay.card_desc": "Kartu kredit/debit",
    "page.tenant_pay.transfer_label": "Transfer Bank", "page.tenant_pay.transfer_desc": "Transfer langsung",
    "page.tenant_pay.method_title": "Pilih metode pembayaran", "page.tenant_pay.toast_success": "Pembayaran berhasil",
    "page.tenant_pay.no_property": "Tidak ada properti terhubung.",
    "page.tenant_pay.up_to_date": "Lunas", "page.tenant_pay.no_unpaid": "Tidak ada sewa tertunggak.",
    "page.tenant_pay.rent_line": "Sewa", "page.tenant_pay.charges_line": "Biaya layanan",
    "page.tenant_pay.pay_btn": "Bayar", "page.settings.title": "Pengaturan",
    "page.accounting.title": "Akuntansi", "page.accounting.revenue": "Pendapatan", "page.accounting.expenses": "Pengeluaran",
    "page.signature.landlord": "Tanda tangan pemilik", "page.signature.tenant": "Tanda tangan penyewa", "page.signature.date": "Tanggal tanda tangan",
  },
  ms: {
    "page.tenant_pay.title": "Pembayaran", "page.tenant_pay.subtitle": "Bayar sewa tertunggak secara dalam talian",
    "page.tenant_pay.card_label": "Kad", "page.tenant_pay.card_desc": "Kad kredit/debit",
    "page.tenant_pay.transfer_label": "Pindahan Bank", "page.tenant_pay.transfer_desc": "Pindahan terus",
    "page.tenant_pay.method_title": "Pilih kaedah pembayaran",
    "page.tenant_pay.no_property": "Tiada hartanah dikaitkan.",
    "page.tenant_pay.up_to_date": "Selesai", "page.tenant_pay.no_unpaid": "Tiada sewa tertunggak.",
    "page.tenant_pay.rent_line": "Sewa", "page.tenant_pay.pay_btn": "Bayar", "page.settings.title": "Tetapan",
    "page.signature.landlord": "Tandatangan tuan rumah", "page.signature.tenant": "Tandatangan penyewa",
  },
  sv: {
    "page.tenant_pay.title": "Betalning", "page.tenant_pay.subtitle": "Betala obetald hyra online",
    "page.tenant_pay.card_label": "Kort", "page.tenant_pay.card_desc": "Kredit-/betalkort",
    "page.tenant_pay.transfer_label": "Banköverföring", "page.tenant_pay.transfer_desc": "Direkt banköverföring",
    "page.tenant_pay.method_title": "Välj betalningsmetod", "page.tenant_pay.toast_success": "Betalning genomförd",
    "page.tenant_pay.no_property": "Ingen fastighet kopplad.", "page.tenant_pay.up_to_date": "Allt betalt",
    "page.tenant_pay.no_unpaid": "Inga obetalda hyror.", "page.tenant_pay.rent_line": "Hyra",
    "page.tenant_pay.charges_line": "Avgifter", "page.tenant_pay.pay_btn": "Betala",
    "page.settings.title": "Inställningar", "page.accounting.title": "Bokföring",
    "page.signature.landlord": "Hyresvärdens underskrift", "page.signature.tenant": "Hyresgästens underskrift", "page.signature.date": "Datum",
  },
  da: {
    "page.tenant_pay.title": "Betaling", "page.tenant_pay.subtitle": "Betal ubetalt leje online",
    "page.tenant_pay.card_label": "Kort", "page.tenant_pay.transfer_label": "Bankoverførsel",
    "page.tenant_pay.method_title": "Vælg betalingsmetode",
    "page.tenant_pay.no_property": "Ingen ejendom tilknyttet.", "page.tenant_pay.up_to_date": "Alt betalt",
    "page.tenant_pay.rent_line": "Leje", "page.tenant_pay.pay_btn": "Betal",
    "page.settings.title": "Indstillinger", "page.accounting.title": "Regnskab",
    "page.signature.landlord": "Udlejers underskrift", "page.signature.tenant": "Lejers underskrift",
  },
  nb: {
    "page.tenant_pay.title": "Betaling", "page.tenant_pay.subtitle": "Betal ubetalt leie på nett",
    "page.tenant_pay.card_label": "Kort", "page.tenant_pay.transfer_label": "Bankoverføring",
    "page.tenant_pay.method_title": "Velg betalingsmetode",
    "page.tenant_pay.no_property": "Ingen eiendom tilknyttet.", "page.tenant_pay.up_to_date": "Alt betalt",
    "page.tenant_pay.rent_line": "Leie", "page.tenant_pay.pay_btn": "Betal",
    "page.settings.title": "Innstillinger", "page.accounting.title": "Regnskap",
    "page.signature.landlord": "Utleiers signatur", "page.signature.tenant": "Leietakers signatur",
  },
  fi: {
    "page.tenant_pay.title": "Maksu", "page.tenant_pay.subtitle": "Maksa maksamattomat vuokrat verkossa",
    "page.tenant_pay.card_label": "Kortti", "page.tenant_pay.transfer_label": "Tilisiirto",
    "page.tenant_pay.method_title": "Valitse maksutapa",
    "page.tenant_pay.no_property": "Ei liitettyä kiinteistöä.", "page.tenant_pay.up_to_date": "Kaikki maksettu",
    "page.tenant_pay.rent_line": "Vuokra", "page.tenant_pay.pay_btn": "Maksa",
    "page.settings.title": "Asetukset", "page.accounting.title": "Kirjanpito",
    "page.signature.landlord": "Vuokranantajan allekirjoitus", "page.signature.tenant": "Vuokralaisen allekirjoitus",
  },
  el: {
    "page.tenant_pay.title": "Πληρωμή", "page.tenant_pay.subtitle": "Πληρώστε οφειλόμενα ενοίκια online",
    "page.tenant_pay.card_label": "Κάρτα", "page.tenant_pay.transfer_label": "Τραπεζικό έμβασμα",
    "page.tenant_pay.method_title": "Επιλέξτε μέθοδο πληρωμής",
    "page.tenant_pay.no_property": "Δεν υπάρχει συνδεδεμένο ακίνητο.", "page.tenant_pay.up_to_date": "Όλα εξοφλημένα",
    "page.tenant_pay.rent_line": "Ενοίκιο", "page.tenant_pay.pay_btn": "Πληρωμή",
    "page.settings.title": "Ρυθμίσεις", "page.accounting.title": "Λογιστική",
    "page.signature.landlord": "Υπογραφή ιδιοκτήτη", "page.signature.tenant": "Υπογραφή ενοικιαστή",
  },
  cs: {
    "page.tenant_pay.title": "Platba", "page.tenant_pay.subtitle": "Zaplaťte dlužné nájemné online",
    "page.tenant_pay.card_label": "Karta", "page.tenant_pay.transfer_label": "Bankovní převod",
    "page.tenant_pay.method_title": "Vyberte platební metodu",
    "page.tenant_pay.no_property": "Žádná nemovitost není propojena.", "page.tenant_pay.up_to_date": "Vše zaplaceno",
    "page.tenant_pay.rent_line": "Nájem", "page.tenant_pay.pay_btn": "Zaplatit",
    "page.settings.title": "Nastavení", "page.accounting.title": "Účetnictví",
    "page.signature.landlord": "Podpis pronajímatele", "page.signature.tenant": "Podpis nájemce",
  },
  hu: {
    "page.tenant_pay.title": "Fizetés", "page.tenant_pay.subtitle": "Fizesse be a hátralékos bérleti díjat online",
    "page.tenant_pay.card_label": "Kártya", "page.tenant_pay.transfer_label": "Átutalás",
    "page.tenant_pay.method_title": "Válasszon fizetési módot",
    "page.tenant_pay.no_property": "Nincs csatolt ingatlan.", "page.tenant_pay.up_to_date": "Minden rendezve",
    "page.tenant_pay.rent_line": "Bérleti díj", "page.tenant_pay.pay_btn": "Fizetés",
    "page.settings.title": "Beállítások", "page.accounting.title": "Könyvelés",
    "page.signature.landlord": "Bérbeadó aláírása", "page.signature.tenant": "Bérlő aláírása",
  },
  ro: {
    "page.tenant_pay.title": "Plată", "page.tenant_pay.subtitle": "Plătiți chiria restantă online",
    "page.tenant_pay.card_label": "Card", "page.tenant_pay.transfer_label": "Transfer bancar",
    "page.tenant_pay.method_title": "Alegeți metoda de plată",
    "page.tenant_pay.no_property": "Nicio proprietate asociată.", "page.tenant_pay.up_to_date": "Totul achitat",
    "page.tenant_pay.rent_line": "Chirie", "page.tenant_pay.pay_btn": "Plătiți",
    "page.settings.title": "Setări", "page.accounting.title": "Contabilitate",
    "page.signature.landlord": "Semnătura proprietarului", "page.signature.tenant": "Semnătura chiriașului",
  },
  hr: {
    "page.tenant_pay.title": "Plaćanje", "page.tenant_pay.subtitle": "Platite dugovanje najamnine online",
    "page.tenant_pay.card_label": "Kartica", "page.tenant_pay.transfer_label": "Bankovni prijenos",
    "page.tenant_pay.no_property": "Nema povezane nekretnine.", "page.tenant_pay.up_to_date": "Sve plaćeno",
    "page.tenant_pay.rent_line": "Najamnina", "page.tenant_pay.pay_btn": "Plati",
    "page.settings.title": "Postavke", "page.accounting.title": "Računovodstvo",
    "page.signature.landlord": "Potpis najmodavca", "page.signature.tenant": "Potpis najmoprimca",
  },
  bg: {
    "page.tenant_pay.title": "Плащане", "page.tenant_pay.subtitle": "Платете дължим наем онлайн",
    "page.tenant_pay.card_label": "Карта", "page.tenant_pay.transfer_label": "Банков превод",
    "page.tenant_pay.no_property": "Няма свързан имот.", "page.tenant_pay.up_to_date": "Всичко платено",
    "page.tenant_pay.rent_line": "Наем", "page.tenant_pay.pay_btn": "Плати",
    "page.settings.title": "Настройки", "page.accounting.title": "Счетоводство",
    "page.signature.landlord": "Подпис наемодател", "page.signature.tenant": "Подпис наемател",
  },
  sk: {
    "page.tenant_pay.title": "Platba", "page.tenant_pay.subtitle": "Zaplaťte dlžné nájomné online",
    "page.tenant_pay.card_label": "Karta", "page.tenant_pay.transfer_label": "Bankový prevod",
    "page.tenant_pay.no_property": "Žiadna nehnuteľnosť nie je pripojená.", "page.tenant_pay.up_to_date": "Všetko zaplatené",
    "page.tenant_pay.rent_line": "Nájomné", "page.tenant_pay.pay_btn": "Zaplatiť",
    "page.settings.title": "Nastavenia", "page.accounting.title": "Účtovníctvo",
    "page.signature.landlord": "Podpis prenajímateľa", "page.signature.tenant": "Podpis nájomcu",
  },
  he: {
    "page.tenant_pay.title": "תשלום", "page.tenant_pay.subtitle": "שלמו שכר דירה באופן מקוון",
    "page.tenant_pay.card_label": "כרטיס", "page.tenant_pay.transfer_label": "העברה בנקאית",
    "page.tenant_pay.no_property": "אין נכס מקושר.", "page.tenant_pay.up_to_date": "הכל שולם",
    "page.tenant_pay.rent_line": "שכ\"ד", "page.tenant_pay.pay_btn": "שלם",
    "page.settings.title": "הגדרות", "page.accounting.title": "הנהלת חשבונות",
    "page.signature.landlord": "חתימת המשכיר", "page.signature.tenant": "חתימת השוכר", "page.signature.date": "תאריך",
  },
  uk: {
    "page.tenant_pay.title": "Оплата", "page.tenant_pay.subtitle": "Сплатіть заборгованість за оренду онлайн",
    "page.tenant_pay.card_label": "Картка", "page.tenant_pay.transfer_label": "Банківський переказ",
    "page.tenant_pay.no_property": "Немає пов'язаної нерухомості.", "page.tenant_pay.up_to_date": "Все оплачено",
    "page.tenant_pay.rent_line": "Оренда", "page.tenant_pay.pay_btn": "Сплатити",
    "page.settings.title": "Налаштування", "page.accounting.title": "Бухгалтерія",
    "page.signature.landlord": "Підпис орендодавця", "page.signature.tenant": "Підпис орендаря", "page.signature.date": "Дата",
  },
};

// Export merged objects per locale
export const koPayExtra = paymentKeys.ko;
export const zhPayExtra = paymentKeys.zh;
export const hiPayExtra = paymentKeys.hi;
export const thPayExtra = paymentKeys.th;
export const viPayExtra = paymentKeys.vi;
export const idPayExtra = paymentKeys.id;
export const msPayExtra = paymentKeys.ms;
export const svPayExtra = paymentKeys.sv;
export const daPayExtra = paymentKeys.da;
export const nbPayExtra = paymentKeys.nb;
export const fiPayExtra = paymentKeys.fi;
export const elPayExtra = paymentKeys.el;
export const csPayExtra = paymentKeys.cs;
export const huPayExtra = paymentKeys.hu;
export const roPayExtra = paymentKeys.ro;
export const hrPayExtra = paymentKeys.hr;
export const bgPayExtra = paymentKeys.bg;
export const skPayExtra = paymentKeys.sk;
export const hePayExtra = paymentKeys.he;
export const ukPayExtra = paymentKeys.uk;
