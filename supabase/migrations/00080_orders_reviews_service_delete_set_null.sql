-- Game delete CASCADE-removes services; keep historical orders/reviews (nullable service_id).

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_service_id_fkey;
ALTER TABLE orders
  ADD CONSTRAINT orders_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_service_id_fkey;
ALTER TABLE reviews
  ADD CONSTRAINT reviews_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;
