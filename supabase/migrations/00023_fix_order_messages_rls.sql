-- Fix operator precedence bug in order_messages INSERT policy
DROP POLICY IF EXISTS "Order participants can send messages" ON order_messages;

CREATE POLICY "Order participants can send messages" ON order_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND (
      order_id IN (
        SELECT id FROM orders
        WHERE customer_id = auth.uid()
           OR worker_id IN (SELECT id FROM workers WHERE profile_id = auth.uid())
      )
      OR is_admin()
    )
  );
