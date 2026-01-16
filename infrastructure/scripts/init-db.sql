-- Create database schema for Billiard Booking System

-- Clubs/Branches Table
CREATE TABLE IF NOT EXISTS clubs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20),
    description TEXT,
    opening_hours JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table Types
CREATE TABLE IF NOT EXISTS table_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tables
CREATE TABLE IF NOT EXISTS tables (
    id SERIAL PRIMARY KEY,
    club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
    table_type_id INTEGER REFERENCES table_types(id),
    table_number VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    hourly_rate DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (club_id, table_number)
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'staff')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    table_id INTEGER REFERENCES tables(id) ON DELETE CASCADE,
    club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'playing', 'completed', 'cancelled')),
    notes TEXT,
    cancel_reason TEXT,
    cancelled_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_time > start_time)
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_id VARCHAR(255),
    payment_details JSONB,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    related_id INTEGER,
    related_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data

-- Sample Clubs
INSERT INTO clubs (name, address, phone, description, opening_hours) VALUES
('Bida Club Downtown', '123 Main Street, District 1', '0901234567', 'Premium billiard club in the heart of the city', '{"open": "08:00", "close": "23:00"}'),
('Luxury Billiards', '456 Park Avenue, District 3', '0907654321', 'High-end billiard experience', '{"open": "09:00", "close": "24:00"}'),
('Student Bida', '789 University Road, District 10', '0912345678', 'Affordable rates for students', '{"open": "10:00", "close": "22:00"}')
ON CONFLICT DO NOTHING;

-- Sample Table Types
INSERT INTO table_types (name, description) VALUES
('Pool 8-Ball', 'Standard 8-ball pool table'),
('Pool 9-Ball', 'Professional 9-ball table'),
('Snooker', 'Full-size snooker table'),
('Carom', '3-cushion billiards table')
ON CONFLICT DO NOTHING;

-- Sample Tables
INSERT INTO tables (club_id, table_type_id, table_number, name, hourly_rate, status) VALUES
(1, 1, 'T01', 'Bàn 1 - Pool 8', 50000, 'available'),
(1, 1, 'T02', 'Bàn 2 - Pool 8', 50000, 'available'),
(1, 2, 'T03', 'Bàn 3 - Pool 9', 60000, 'available'),
(1, 3, 'T04', 'Bàn 4 - Snooker', 80000, 'available'),
(2, 1, 'T01', 'VIP Bàn 1', 70000, 'available'),
(2, 2, 'T02', 'VIP Bàn 2', 80000, 'available'),
(2, 3, 'T03', 'VIP Bàn 3', 100000, 'available'),
(3, 1, 'T01', 'Bàn Sinh Viên 1', 35000, 'available'),
(3, 1, 'T02', 'Bàn Sinh Viên 2', 35000, 'available'),
(3, 1, 'T03', 'Bàn Sinh Viên 3', 35000, 'available')
ON CONFLICT (club_id, table_number) DO NOTHING;

-- Sample Admin User (password: admin123)
INSERT INTO users (email, password_hash, full_name, phone, role) VALUES
('admin@bidabooking.com', '$2a$10$rYvBqK5tZ8yqYZ0p9Z9Z9e9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9ZO', 'Admin User', '0900000000', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tables_club_id ON tables(club_id);
CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_table_id ON bookings(table_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
