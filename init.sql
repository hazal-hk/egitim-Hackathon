USE world_edu_db;

CREATE TABLE countries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    iso_code VARCHAR(3) UNIQUE,
    image_1_url VARCHAR(255), 
    image_2_url VARCHAR(255)
);

CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    parent_id INT NULL, 
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE country_contents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    country_id INT NOT NULL,
    category_id INT NOT NULL,
    content_text TEXT NOT NULL,
    FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE KEY unique_country_category (country_id, category_id)
);

-- Test Verileri (Mock Data)
INSERT INTO countries (id, name, iso_code, image_1_url, image_2_url) VALUES
(1, 'Türkiye', 'TUR', 'https://example.com/turkey1.jpg', 'https://example.com/turkey2.jpg'),
(2, 'Japonya', 'JPN', 'https://example.com/japan1.jpg', 'https://example.com/japan2.jpg');

INSERT INTO categories (id, name, parent_id) VALUES
(1, 'Kültür', NULL), (2, 'Coğrafya', NULL),
(3, 'Yemekler', 1), (4, 'Önemli Dağlar', 2);

INSERT INTO country_contents (country_id, category_id, content_text) VALUES
(1, 3, 'Türk mutfağı zengin bir kebap ve zeytinyağlı kültürüne sahiptir.'),
(2, 3, 'Japon mutfağının temeli pirinç, deniz ürünleri ve sushiye dayanır.');