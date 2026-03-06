/**
 * i18n-pages-extra.ts — Missing page translations for ES, DE, PT + enhanced world language coverage
 * Adds seasonal, tenant, listing, inventory, fiscal, company, auth, and doc_builder keys
 */

// ─── Spanish (ES) — Missing page keys ───
export const pageEsExtra: Record<string, string> = {
  "page.seasonal.title": "Alquileres temporales", "page.seasonal.subtitle": "Gestione sus reservas de corta duración, Airbnb y Booking.",
  "page.seasonal.add": "Añadir", "page.seasonal.calendar": "Calendario", "page.seasonal.reservations": "Reservas",
  "page.seasonal.listings": "Anuncios", "page.seasonal.requests": "Solicitudes", "page.seasonal.import_ical": "Importar iCal",
  "page.seasonal.guest_name": "Nombre del viajero", "page.seasonal.guest_email": "Email", "page.seasonal.guest_phone": "Teléfono",
  "page.seasonal.check_in": "Llegada", "page.seasonal.check_out": "Salida", "page.seasonal.amount": "Importe total",
  "page.seasonal.cleaning_fee": "Gastos de limpieza", "page.seasonal.deposit": "Fianza", "page.seasonal.property": "Inmueble",
  "page.seasonal.notes": "Notas", "page.seasonal.save": "Guardar", "page.seasonal.cancel": "Cancelar",
  "page.seasonal.confirmed": "Confirmada", "page.seasonal.cancelled": "Cancelada", "page.seasonal.pending": "Pendiente",
  "page.seasonal.no_reservations": "Sin reservas", "page.seasonal.loading": "Cargando…",
  "page.seasonal.day_names": "Lun,Mar,Mié,Jue,Vie,Sáb,Dom",
  "page.seasonal.new_booking": "Nueva reserva", "page.seasonal.edit_booking": "Editar reserva",
  "page.seasonal.photos_listing": "Fotos y anuncio público",
  "page.tsignup.invalid_link": "Enlace de invitación inválido.",
  "page.tsignup.create_space": "Crear su espacio de inquilino",
  "page.tsignup.invite_desc": "Su arrendador le invita a unirse a Easy-Locs.",
  "page.tsignup.full_name": "Nombre completo", "page.tsignup.email": "Email", "page.tsignup.password": "Contraseña",
  "page.tsignup.activate_btn": "Activar mi espacio", "page.tsignup.powered_by": "Desarrollado por",
  "page.tsignup.verified_badge": "Invitación verificada",
  "page.listing.per_night": "/ noche", "page.listing.guests_max": "viajero(s) máx.",
  "page.listing.book_title": "Reservar este alojamiento", "page.listing.send_request": "Enviar solicitud",
  "page.listing.request_sent": "¡Solicitud enviada!", "page.listing.pay_now": "Pagar ahora",
  "page.listing_mgr.title": "Anuncio público", "page.listing_mgr.create_btn": "Crear anuncio",
  "page.listing_mgr.link_copied": "¡Enlace copiado!",
  "page.inventory.entry": "Inventario de entrada", "page.inventory.exit": "Inventario de salida",
  "page.inventory.back": "Volver", "page.inventory.draft_btn": "Borrador", "page.inventory.pdf_btn": "PDF",
  "page.inventory.finalize_btn": "Finalizar y enviar", "page.inventory.rooms_label": "Habitaciones",
  "page.inventory.general_info": "Información general", "page.inventory.date": "Fecha",
  "page.inventory.keys_label": "Llaves entregadas", "page.inventory.meters": "Lecturas de contadores",
  "page.inventory.electricity": "Electricidad (kWh)", "page.inventory.gas": "Gas (m³)", "page.inventory.water": "Agua (m³)",
  "page.inventory.add_room": "Añadir", "page.inventory.add_element": "Añadir un elemento…",
  "page.inventory.cond_good": "Bueno", "page.inventory.cond_average": "Regular", "page.inventory.cond_bad": "Malo",
  "page.fiscal.title": "Informe fiscal — Ingresos inmobiliarios",
  "page.fiscal.subtitle": "Analice sus ingresos y gastos para su declaración fiscal.",
  "page.fiscal.gross_revenue": "Ingresos brutos", "page.fiscal.deductible_expenses": "Gastos deducibles",
  "page.fiscal.taxable_income": "RENTA IMPONIBLE", "page.fiscal.no_data": "No hay datos.",
  "page.company.title": "Empresa", "page.company.subtitle": "Cree y gestione su sociedad.",
  "page.company.create_company": "Crear mi empresa",
  "page.tenant_pay.title": "Pagar mi alquiler", "page.tenant_pay.subtitle": "Elija su método de pago.",
  "page.tenant_pay.card_label": "Tarjeta / Apple Pay / Google Pay",
  "page.tenant_pay.transfer_label": "Transferencia bancaria", "page.tenant_pay.sepa_label": "Domiciliación SEPA",
  "page.tenant_pay.up_to_date": "¡Está al día!", "page.tenant_pay.pay_btn": "Pagar",
  "auth.forgot.title": "Contraseña olvidada", "auth.forgot.submit": "Enviar enlace",
  "auth.reset.title": "Nueva contraseña", "auth.reset.submit": "Restablecer",
  "auth.verify.title": "Verifique su email", "auth.verify.resend": "Reenviar email",
  "landing.hero.badge": "Larga duración • Airbnb • Booking • Multi-país",
  "nav.referrals": "Referidos", "referral.title": "Programa de referidos",
};

// ─── German (DE) — Missing page keys ───
export const pageDeExtra: Record<string, string> = {
  "page.seasonal.title": "Ferienvermietungen", "page.seasonal.subtitle": "Verwalten Sie Ihre Kurzzeitbuchungen.",
  "page.seasonal.calendar": "Kalender", "page.seasonal.reservations": "Buchungen",
  "page.seasonal.no_reservations": "Keine Buchungen", "page.seasonal.loading": "Laden…",
  "page.seasonal.day_names": "Mo,Di,Mi,Do,Fr,Sa,So",
  "page.seasonal.new_booking": "Neue Buchung", "page.seasonal.edit_booking": "Buchung bearbeiten",
  "page.tsignup.create_space": "Erstellen Sie Ihren Mieterbereich",
  "page.tsignup.activate_btn": "Mieterbereich aktivieren", "page.tsignup.powered_by": "Bereitgestellt von",
  "page.listing.per_night": "/ Nacht", "page.listing.book_title": "Diese Unterkunft buchen",
  "page.listing.send_request": "Anfrage senden", "page.listing.pay_now": "Jetzt bezahlen",
  "page.listing_mgr.title": "Öffentliches Inserat", "page.listing_mgr.create_btn": "Inserat erstellen",
  "page.inventory.entry": "Einzugsprotokoll", "page.inventory.exit": "Auszugsprotokoll",
  "page.inventory.rooms_label": "Räume", "page.inventory.general_info": "Allgemeine Informationen",
  "page.inventory.keys_label": "Übergebene Schlüssel", "page.inventory.meters": "Zählerstände",
  "page.inventory.cond_good": "Gut", "page.inventory.cond_average": "Mittel", "page.inventory.cond_bad": "Schlecht",
  "page.fiscal.title": "Steuerbericht — Mieteinnahmen",
  "page.fiscal.subtitle": "Analysieren Sie Ihre Einnahmen für Ihre Steuererklärung.",
  "page.fiscal.gross_revenue": "Bruttoeinnahmen", "page.fiscal.deductible_expenses": "Abzugsfähige Ausgaben",
  "page.fiscal.taxable_income": "ZU VERSTEUERNDES EINKOMMEN", "page.fiscal.no_data": "Keine Daten.",
  "page.company.title": "Unternehmen", "page.company.create_company": "Unternehmen gründen",
  "page.tenant_pay.title": "Miete bezahlen", "page.tenant_pay.subtitle": "Zahlungsmethode wählen.",
  "page.tenant_pay.card_label": "Karte / Apple Pay / Google Pay",
  "page.tenant_pay.transfer_label": "Banküberweisung", "page.tenant_pay.sepa_label": "SEPA-Lastschrift",
  "page.tenant_pay.up_to_date": "Alles bezahlt!", "page.tenant_pay.pay_btn": "Bezahlen",
  "auth.forgot.title": "Passwort vergessen", "auth.forgot.submit": "Link senden",
  "auth.reset.title": "Neues Passwort", "auth.reset.submit": "Zurücksetzen",
  "auth.verify.title": "E-Mail verifizieren", "auth.verify.resend": "Erneut senden",
  "landing.hero.badge": "Langfristig • Airbnb • Booking • Multi-Land",
  "nav.referrals": "Empfehlungen", "referral.title": "Empfehlungsprogramm",
};

// ─── Portuguese (PT) — Missing page keys ───
export const pagePtExtra: Record<string, string> = {
  "page.seasonal.title": "Arrendamentos temporários", "page.seasonal.subtitle": "Gerencie reservas de curta duração.",
  "page.seasonal.calendar": "Calendário", "page.seasonal.reservations": "Reservas",
  "page.seasonal.no_reservations": "Sem reservas", "page.seasonal.loading": "Carregando…",
  "page.seasonal.day_names": "Seg,Ter,Qua,Qui,Sex,Sáb,Dom",
  "page.seasonal.new_booking": "Nova reserva", "page.seasonal.edit_booking": "Editar reserva",
  "page.tsignup.create_space": "Crie seu espaço de inquilino",
  "page.tsignup.activate_btn": "Ativar meu espaço", "page.tsignup.powered_by": "Desenvolvido por",
  "page.listing.per_night": "/ noite", "page.listing.book_title": "Reservar este alojamento",
  "page.listing.send_request": "Enviar pedido", "page.listing.pay_now": "Pagar agora",
  "page.listing_mgr.title": "Anúncio público", "page.listing_mgr.create_btn": "Criar anúncio",
  "page.inventory.entry": "Vistoria de entrada", "page.inventory.exit": "Vistoria de saída",
  "page.inventory.rooms_label": "Cômodos", "page.inventory.general_info": "Informações gerais",
  "page.inventory.keys_label": "Chaves entregues", "page.inventory.meters": "Leituras de medidores",
  "page.inventory.cond_good": "Bom", "page.inventory.cond_average": "Regular", "page.inventory.cond_bad": "Ruim",
  "page.fiscal.title": "Relatório fiscal — Rendimentos imobiliários",
  "page.fiscal.subtitle": "Analise seus rendimentos para declaração fiscal.",
  "page.fiscal.gross_revenue": "Rendimentos brutos", "page.fiscal.deductible_expenses": "Despesas dedutíveis",
  "page.fiscal.taxable_income": "RENDIMENTO TRIBUTÁVEL", "page.fiscal.no_data": "Sem dados.",
  "page.company.title": "Empresa", "page.company.create_company": "Criar minha empresa",
  "page.tenant_pay.title": "Pagar aluguel", "page.tenant_pay.subtitle": "Escolha o método de pagamento.",
  "page.tenant_pay.card_label": "Cartão / Apple Pay / Google Pay",
  "page.tenant_pay.transfer_label": "Transferência bancária", "page.tenant_pay.sepa_label": "Débito SEPA",
  "page.tenant_pay.up_to_date": "Você está em dia!", "page.tenant_pay.pay_btn": "Pagar",
  "auth.forgot.title": "Esqueceu a senha", "auth.forgot.submit": "Enviar link",
  "auth.reset.title": "Nova senha", "auth.reset.submit": "Redefinir",
  "auth.verify.title": "Verifique seu email", "auth.verify.resend": "Reenviar email",
  "landing.hero.badge": "Longo prazo • Airbnb • Booking • Multi-país",
  "nav.referrals": "Referências", "referral.title": "Programa de referências",
};

// ─── Enhanced world language keys (settings, doc_builder, seasonal, fiscal, tenant_pay) ───
export const koPageExtra: Record<string, string> = {
  "page.settings.title": "설정", "page.settings.subtitle": "프로필과 조직을 관리하세요.",
  "page.settings.profile": "프로필", "page.settings.full_name": "성명", "page.settings.email": "이메일",
  "page.settings.country": "국가", "page.settings.save_profile": "프로필 저장", "page.settings.saving": "저장 중...",
  "page.settings.org_title": "조직 및 문서 사용자 지정", "page.settings.org_name": "조직명",
  "page.settings.signature": "내 서명", "page.settings.save_signature": "서명 저장",
  "page.settings.profile_updated": "프로필 업데이트됨", "page.settings.org_updated": "조직 업데이트됨",
  "page.doc_builder.prefill_tenant": "세입자로부터 자동 입력", "page.doc_builder.select_tenant": "— 세입자 선택 —",
  "page.doc_builder.legal_basis": "법적 근거", "page.doc_builder.signature": "서명",
  "page.doc_builder.landlord_signature": "귀하의 서명 (집주인)", "page.doc_builder.tenant_signature": "귀하의 서명 (세입자)",
  "page.doc_builder.generated": "문서가 생성되어 이력에 저장되었습니다.",
  "page.seasonal.title": "단기 임대", "page.seasonal.calendar": "캘린더",
  "page.inventory.entry": "입주 점검", "page.inventory.exit": "퇴거 점검",
  "page.fiscal.title": "세무 보고서", "page.tenant_pay.title": "임대료 납부",
  "auth.forgot.title": "비밀번호 찾기", "auth.reset.title": "새 비밀번호", "auth.verify.title": "이메일 인증",
  "landing.hero.badge": "장기 • Airbnb • Booking • 다국가",
};

export const zhPageExtra: Record<string, string> = {
  "page.settings.title": "设置", "page.settings.profile": "个人资料", "page.settings.save_profile": "保存个人资料",
  "page.settings.signature": "我的签名", "page.settings.save_signature": "保存签名",
  "page.settings.profile_updated": "个人资料已更新", "page.settings.org_updated": "组织已更新",
  "page.doc_builder.prefill_tenant": "从租户自动填充", "page.doc_builder.select_tenant": "— 选择租户 —",
  "page.doc_builder.signature": "签名", "page.doc_builder.generated": "文档已生成并保存到历史记录。",
  "page.seasonal.title": "短期租赁", "page.seasonal.calendar": "日历",
  "page.inventory.entry": "入住检查", "page.inventory.exit": "退房检查",
  "page.fiscal.title": "税务报告", "page.tenant_pay.title": "支付房租",
  "landing.hero.badge": "长期 • Airbnb • Booking • 多国",
};

export const hiPageExtra: Record<string, string> = {
  "page.settings.title": "सेटिंग्स", "page.settings.profile": "प्रोफ़ाइल",
  "page.settings.signature": "मेरा हस्ताक्षर", "page.settings.profile_updated": "प्रोफ़ाइल अपडेट हो गई",
  "page.doc_builder.prefill_tenant": "किरायेदार से भरें", "page.doc_builder.signature": "हस्ताक्षर",
  "page.doc_builder.generated": "दस्तावेज़ बनाया और सहेजा गया।",
  "page.seasonal.title": "अल्पकालिक किराया", "page.inventory.entry": "प्रवेश निरीक्षण",
  "page.fiscal.title": "कर रिपोर्ट", "page.tenant_pay.title": "किराया भुगतान",
  "landing.hero.badge": "दीर्घकालिक • Airbnb • Booking • बहु-देश",
};

export const svPageExtra: Record<string, string> = {
  "page.settings.title": "Inställningar", "page.settings.profile": "Profil",
  "page.settings.signature": "Min signatur", "page.doc_builder.prefill_tenant": "Fyll i från hyresgäst",
  "page.doc_builder.signature": "Signatur", "page.doc_builder.generated": "Dokument genererat och sparat.",
  "page.seasonal.title": "Korttidsuthyrning", "page.inventory.entry": "Inflyttningsbesiktning",
  "page.fiscal.title": "Skatterapport", "page.tenant_pay.title": "Betala hyra",
};

export const daPageExtra: Record<string, string> = {
  "page.settings.title": "Indstillinger", "page.settings.profile": "Profil",
  "page.settings.signature": "Min underskrift", "page.doc_builder.prefill_tenant": "Udfyld fra lejer",
  "page.doc_builder.signature": "Underskrift", "page.doc_builder.generated": "Dokument genereret og gemt.",
  "page.seasonal.title": "Korttidsudlejning", "page.inventory.entry": "Indflytningssyn",
  "page.fiscal.title": "Skatterapport", "page.tenant_pay.title": "Betal husleje",
};

export const nbPageExtra: Record<string, string> = {
  "page.settings.title": "Innstillinger", "page.settings.profile": "Profil",
  "page.settings.signature": "Min signatur", "page.doc_builder.prefill_tenant": "Fyll ut fra leietaker",
  "page.doc_builder.signature": "Signatur", "page.doc_builder.generated": "Dokument generert og lagret.",
  "page.seasonal.title": "Korttidsutleie", "page.inventory.entry": "Innflyttingsbefaring",
  "page.fiscal.title": "Skatterapport", "page.tenant_pay.title": "Betal husleie",
};

export const fiPageExtra: Record<string, string> = {
  "page.settings.title": "Asetukset", "page.settings.profile": "Profiili",
  "page.settings.signature": "Allekirjoitukseni", "page.doc_builder.prefill_tenant": "Täytä vuokralaiselta",
  "page.doc_builder.signature": "Allekirjoitus", "page.doc_builder.generated": "Asiakirja luotu ja tallennettu.",
  "page.seasonal.title": "Lyhytaikaisvuokraus", "page.inventory.entry": "Muuttokatselmus",
  "page.fiscal.title": "Veroraportti", "page.tenant_pay.title": "Maksa vuokra",
};

export const elPageExtra: Record<string, string> = {
  "page.settings.title": "Ρυθμίσεις", "page.settings.profile": "Προφίλ",
  "page.settings.signature": "Η υπογραφή μου", "page.doc_builder.prefill_tenant": "Συμπλήρωση από ενοικιαστή",
  "page.doc_builder.signature": "Υπογραφή", "page.doc_builder.generated": "Έγγραφο δημιουργήθηκε και αποθηκεύτηκε.",
  "page.seasonal.title": "Βραχυχρόνιες μισθώσεις", "page.inventory.entry": "Πρωτόκολλο εισόδου",
  "page.fiscal.title": "Φορολογική αναφορά", "page.tenant_pay.title": "Πληρωμή ενοικίου",
};

export const csPageExtra: Record<string, string> = {
  "page.settings.title": "Nastavení", "page.settings.profile": "Profil",
  "page.settings.signature": "Můj podpis", "page.doc_builder.prefill_tenant": "Vyplnit od nájemce",
  "page.doc_builder.signature": "Podpis", "page.doc_builder.generated": "Dokument vytvořen a uložen.",
  "page.seasonal.title": "Krátkodobé pronájmy", "page.inventory.entry": "Protokol o předání",
  "page.fiscal.title": "Daňový přehled", "page.tenant_pay.title": "Platba nájmu",
};

export const huPageExtra: Record<string, string> = {
  "page.settings.title": "Beállítások", "page.settings.profile": "Profil",
  "page.settings.signature": "Aláírásom", "page.doc_builder.prefill_tenant": "Kitöltés bérlőtől",
  "page.doc_builder.signature": "Aláírás", "page.doc_builder.generated": "Dokumentum létrehozva és mentve.",
  "page.seasonal.title": "Rövid távú bérbeadás", "page.inventory.entry": "Beköltözési jegyzőkönyv",
  "page.fiscal.title": "Adójelentés", "page.tenant_pay.title": "Bérleti díj fizetése",
};

export const roPageExtra: Record<string, string> = {
  "page.settings.title": "Setări", "page.settings.profile": "Profil",
  "page.settings.signature": "Semnătura mea", "page.doc_builder.prefill_tenant": "Completare de la chiriaș",
  "page.doc_builder.signature": "Semnătură", "page.doc_builder.generated": "Document generat și salvat.",
  "page.seasonal.title": "Închirieri pe termen scurt", "page.inventory.entry": "Proces-verbal de predare",
  "page.fiscal.title": "Raport fiscal", "page.tenant_pay.title": "Plata chiriei",
};

export const hrPageExtra: Record<string, string> = {
  "page.settings.title": "Postavke", "page.settings.profile": "Profil",
  "page.settings.signature": "Moj potpis", "page.doc_builder.prefill_tenant": "Ispuni od stanara",
  "page.doc_builder.signature": "Potpis", "page.doc_builder.generated": "Dokument generiran i spremljen.",
  "page.seasonal.title": "Kratkoročni najam", "page.inventory.entry": "Zapisnik o primopredaji",
  "page.fiscal.title": "Porezni izvještaj", "page.tenant_pay.title": "Plaćanje najamnine",
};

export const bgPageExtra: Record<string, string> = {
  "page.settings.title": "Настройки", "page.settings.profile": "Профил",
  "page.settings.signature": "Моят подпис", "page.doc_builder.prefill_tenant": "Попълни от наемател",
  "page.doc_builder.signature": "Подпис", "page.doc_builder.generated": "Документът е генериран и запазен.",
  "page.seasonal.title": "Краткосрочен наем", "page.inventory.entry": "Приемо-предавателен протокол",
  "page.fiscal.title": "Данъчен отчет", "page.tenant_pay.title": "Плащане на наем",
};

export const skPageExtra: Record<string, string> = {
  "page.settings.title": "Nastavenia", "page.settings.profile": "Profil",
  "page.settings.signature": "Môj podpis", "page.doc_builder.prefill_tenant": "Vyplniť od nájomníka",
  "page.doc_builder.signature": "Podpis", "page.doc_builder.generated": "Dokument vytvorený a uložený.",
  "page.seasonal.title": "Krátkodobé prenájmy", "page.inventory.entry": "Protokol o odovzdaní",
  "page.fiscal.title": "Daňový prehľad", "page.tenant_pay.title": "Platba nájmu",
};

export const hePageExtra: Record<string, string> = {
  "page.settings.title": "הגדרות", "page.settings.profile": "פרופיל",
  "page.settings.signature": "החתימה שלי", "page.doc_builder.prefill_tenant": "מלא משוכר",
  "page.doc_builder.signature": "חתימה", "page.doc_builder.generated": "המסמך נוצר ונשמר.",
  "page.seasonal.title": "השכרה לטווח קצר", "page.inventory.entry": "פרוטוקול כניסה",
  "page.fiscal.title": "דוח מס", "page.tenant_pay.title": "תשלום שכר דירה",
};

export const ukPageExtra: Record<string, string> = {
  "page.settings.title": "Налаштування", "page.settings.profile": "Профіль",
  "page.settings.signature": "Мій підпис", "page.doc_builder.prefill_tenant": "Заповнити від орендаря",
  "page.doc_builder.signature": "Підпис", "page.doc_builder.generated": "Документ створено та збережено.",
  "page.seasonal.title": "Короткострокова оренда", "page.inventory.entry": "Акт прийому-передачі",
  "page.fiscal.title": "Податковий звіт", "page.tenant_pay.title": "Оплата оренди",
};

export const thPageExtra: Record<string, string> = {
  "page.settings.title": "ตั้งค่า", "page.settings.profile": "โปรไฟล์",
  "page.doc_builder.signature": "ลายเซ็น", "page.doc_builder.generated": "สร้างเอกสารและบันทึกแล้ว",
  "page.seasonal.title": "เช่าระยะสั้น", "page.inventory.entry": "ตรวจสอบเข้าอยู่",
  "page.tenant_pay.title": "จ่ายค่าเช่า",
};

export const viPageExtra: Record<string, string> = {
  "page.settings.title": "Cài đặt", "page.settings.profile": "Hồ sơ",
  "page.doc_builder.signature": "Chữ ký", "page.doc_builder.generated": "Tài liệu đã được tạo và lưu.",
  "page.seasonal.title": "Cho thuê ngắn hạn", "page.inventory.entry": "Biên bản bàn giao",
  "page.tenant_pay.title": "Thanh toán tiền thuê",
};

export const idPageExtra: Record<string, string> = {
  "page.settings.title": "Pengaturan", "page.settings.profile": "Profil",
  "page.doc_builder.signature": "Tanda tangan", "page.doc_builder.generated": "Dokumen dibuat dan disimpan.",
  "page.seasonal.title": "Sewa jangka pendek", "page.inventory.entry": "Serah terima masuk",
  "page.tenant_pay.title": "Bayar sewa",
};

export const msPageExtra: Record<string, string> = {
  "page.settings.title": "Tetapan", "page.settings.profile": "Profil",
  "page.doc_builder.signature": "Tandatangan", "page.doc_builder.generated": "Dokumen dijana dan disimpan.",
  "page.seasonal.title": "Sewa jangka pendek", "page.inventory.entry": "Pemeriksaan masuk",
  "page.tenant_pay.title": "Bayar sewa",
};
