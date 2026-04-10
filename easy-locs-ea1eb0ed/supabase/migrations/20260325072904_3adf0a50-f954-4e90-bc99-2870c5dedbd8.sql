-- Clean legacy sender_role='user' → 'client'
UPDATE support_ticket_messages SET sender_role = 'client' WHERE sender_role = 'user';

-- Enable realtime on support_ticket_messages for live thread updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_messages;