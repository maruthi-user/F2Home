-- ============================================================
-- Marketplace demo data: 18 farmers, 50 customers, 6 products per farmer.
--
-- PREREQUISITE: the backend has run once so Flyway created the tables
-- (V1 users, V2 marketplace).
--
-- Every user has the password:  Test@123
--
-- Run:
--   PGPASSWORD=admin psql -U postgres -h localhost -d F2Home -f seed-marketplace.sql
--
-- Re-runnable: users are upserted on phone_number; the seed farmers'
-- products are replaced (their media rows cascade, order lines keep their
-- snapshot with product_id set to NULL by the FK).
--
-- Phone ranges:  farmers  +91 91000 000 01..18
--                customers +91 92000 000 01..50
-- Coordinates are real Andhra Pradesh / Telangana towns so the 20 km
-- radius filter gives different results for different customer locations.
-- ============================================================

BEGIN;

-- ---------------------------------------------------------------- FARMERS
INSERT INTO f2home_users
    (phone_number, email, password_hash, role, status, phone_verified, full_name, created_at, updated_at)
SELECT phone, email, '$2a$10$LcXJEYJaZ0LHSNNjZUGCx.yfcOV9WRoTNINfd5gC5NAXAfKQPFoF.',
       'FARMER', 'ACTIVE', TRUE, full_name, NOW(), NOW()
FROM (VALUES
    ('+919100000001', 'venkata.subbaiah@f2home.test',    'Venkata Subbaiah'),
    ('+919100000002', 'padmavathi.naidu@f2home.test',    'Padmavathi Naidu'),
    ('+919100000003', 'srinivasa.chintala@f2home.test',  'Srinivasa Rao Chintala'),
    ('+919100000004', 'anjamma.koppula@f2home.test',     'Anjamma Koppula'),
    ('+919100000005', 'nagendra.kolli@f2home.test',      'Nagendra Babu Kolli'),
    ('+919100000006', 'bhavani.pulipati@f2home.test',    'Bhavani Pulipati'),
    ('+919100000007', 'mallikarjuna.yadav@f2home.test',  'Mallikarjuna Yadav'),
    ('+919100000008', 'saraswathi.gorantla@f2home.test', 'Saraswathi Gorantla'),
    ('+919100000009', 'krishna.vemuri@f2home.test',      'Krishna Murthy Vemuri'),
    ('+919100000010', 'rajeswari.tummala@f2home.test',   'Rajeswari Tummala'),
    ('+919100000011', 'chandra.reddy@f2home.test',       'Chandra Sekhar Reddy'),
    ('+919100000012', 'durga.mekala@f2home.test',        'Durga Prasad Mekala'),
    ('+919100000013', 'suryakantham.bonthu@f2home.test', 'Suryakantham Bonthu'),
    ('+919100000014', 'hanumantha.pasupuleti@f2home.test','Hanumantha Rao Pasupuleti'),
    ('+919100000015', 'yellamma.gundu@f2home.test',      'Yellamma Gundu'),
    -- Hyderabad west (within 20 km of Kondapur / Serilingampalle mandal)
    ('+919100000016', 'narsimha.goud@f2home.test',       'Narsimha Goud'),
    ('+919100000017', 'sujatha.rani@f2home.test',        'Sujatha Rani'),
    ('+919100000018', 'balaraju.mudiraj@f2home.test',    'Balaraju Mudiraj')
) AS f(phone, email, full_name)
ON CONFLICT (phone_number) DO UPDATE
    SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, role = 'FARMER',
        status = 'ACTIVE', phone_verified = TRUE, password_hash = EXCLUDED.password_hash,
        updated_at = NOW();

-- -------------------------------------------------------------- CUSTOMERS
INSERT INTO f2home_users
    (phone_number, email, password_hash, role, status, phone_verified, full_name, created_at, updated_at)
SELECT phone, email, '$2a$10$LcXJEYJaZ0LHSNNjZUGCx.yfcOV9WRoTNINfd5gC5NAXAfKQPFoF.',
       'CUSTOMER', 'ACTIVE', TRUE, full_name, NOW(), NOW()
FROM (VALUES
    ('+919200000001', 'aarav.mehta@f2home.test',        'Aarav Mehta'),
    ('+919200000002', 'priya.raghavan@f2home.test',     'Priya Raghavan'),
    ('+919200000003', 'karthik.nair@f2home.test',       'Karthik Nair'),
    ('+919200000004', 'sneha.kulkarni@f2home.test',     'Sneha Kulkarni'),
    ('+919200000005', 'rohan.deshpande@f2home.test',    'Rohan Deshpande'),
    ('+919200000006', 'divya.menon@f2home.test',        'Divya Menon'),
    ('+919200000007', 'arjun.bhat@f2home.test',         'Arjun Bhat'),
    ('+919200000008', 'meera.iyer@f2home.test',         'Meera Iyer'),
    ('+919200000009', 'vikram.singh@f2home.test',       'Vikram Singh'),
    ('+919200000010', 'ananya.chatterjee@f2home.test',  'Ananya Chatterjee'),
    ('+919200000011', 'siddharth.rao@f2home.test',      'Siddharth Rao'),
    ('+919200000012', 'pooja.hegde@f2home.test',        'Pooja Hegde'),
    ('+919200000013', 'nikhil.verma@f2home.test',       'Nikhil Verma'),
    ('+919200000014', 'kavya.pillai@f2home.test',       'Kavya Pillai'),
    ('+919200000015', 'aditya.joshi@f2home.test',       'Aditya Joshi'),
    ('+919200000016', 'ishita.bose@f2home.test',        'Ishita Bose'),
    ('+919200000017', 'manoj.patil@f2home.test',        'Manoj Patil'),
    ('+919200000018', 'lakshmi.narayanan@f2home.test',  'Lakshmi Narayanan'),
    ('+919200000019', 'rahul.gupta@f2home.test',        'Rahul Gupta'),
    ('+919200000020', 'swathi.reddy@f2home.test',       'Swathi Reddy'),
    ('+919200000021', 'harish.babu@f2home.test',        'Harish Babu'),
    ('+919200000022', 'nandini.krishnan@f2home.test',   'Nandini Krishnan'),
    ('+919200000023', 'varun.malhotra@f2home.test',     'Varun Malhotra'),
    ('+919200000024', 'shreya.das@f2home.test',         'Shreya Das'),
    ('+919200000025', 'praveen.kumar@f2home.test',      'Praveen Kumar'),
    ('+919200000026', 'deepika.shetty@f2home.test',     'Deepika Shetty'),
    ('+919200000027', 'sanjay.mishra@f2home.test',      'Sanjay Mishra'),
    ('+919200000028', 'ritika.saxena@f2home.test',      'Ritika Saxena'),
    ('+919200000029', 'gautam.choudhary@f2home.test',   'Gautam Choudhary'),
    ('+919200000030', 'bhavana.rao@f2home.test',        'Bhavana Rao'),
    ('+919200000031', 'tejaswi.goud@f2home.test',       'Tejaswi Goud'),
    ('+919200000032', 'mohan.krishna@f2home.test',      'Mohan Krishna'),
    ('+919200000033', 'sowmya.balaji@f2home.test',      'Sowmya Balaji'),
    ('+919200000034', 'abhishek.tiwari@f2home.test',    'Abhishek Tiwari'),
    ('+919200000035', 'keerthi.suresh@f2home.test',     'Keerthi Suresh'),
    ('+919200000036', 'yash.agarwal@f2home.test',       'Yash Agarwal'),
    ('+919200000037', 'harini.venkat@f2home.test',      'Harini Venkat'),
    ('+919200000038', 'farhan.ali@f2home.test',         'Farhan Ali'),
    ('+919200000039', 'jyothi.prakash@f2home.test',     'Jyothi Prakash'),
    ('+919200000040', 'suresh.varma@f2home.test',       'Suresh Varma'),
    ('+919200000041', 'anitha.george@f2home.test',      'Anitha George'),
    ('+919200000042', 'ravi.teja@f2home.test',          'Ravi Teja'),
    ('+919200000043', 'madhavi.latha@f2home.test',      'Madhavi Latha'),
    ('+919200000044', 'sameer.khan@f2home.test',        'Sameer Khan'),
    ('+919200000045', 'gayathri.devi@f2home.test',      'Gayathri Devi'),
    ('+919200000046', 'naveen.chandra@f2home.test',     'Naveen Chandra'),
    ('+919200000047', 'pallavi.jain@f2home.test',       'Pallavi Jain'),
    ('+919200000048', 'kiran.kumar@f2home.test',        'Kiran Kumar'),
    ('+919200000049', 'shalini.mathur@f2home.test',     'Shalini Mathur'),
    ('+919200000050', 'vamsi.krishna@f2home.test',      'Vamsi Krishna')
) AS c(phone, email, full_name)
ON CONFLICT (phone_number) DO UPDATE
    SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, role = 'CUSTOMER',
        status = 'ACTIVE', phone_verified = TRUE, password_hash = EXCLUDED.password_hash,
        updated_at = NOW();

-- --------------------------------------------------------------- PRODUCTS
-- Replace the seed farmers' listings so the script can be re-run.
DELETE FROM f2home_products
 WHERE farmer_id IN (SELECT id FROM f2home_users WHERE phone_number LIKE '+919100000%');

INSERT INTO f2home_products
    (farmer_id, farmer_name, name, category, description, price, unit, quantity,
     location_label, lat, lng, status, created_at, updated_at)
SELECT u.id, u.full_name, p.name, p.category, p.description, p.price, p.unit, p.quantity,
       p.place, p.lat, p.lng, 'ACTIVE', NOW() - (random() * interval '20 days'), NOW()
FROM (VALUES
    -- 01 Venkata Subbaiah - Ponnur
    ('+919100000001', 'Fresh Tomatoes',        'vegetables',      'Vine-ripened hybrid tomatoes, picked at dawn.',            32.00, 'kg',    250, 'Ponnur', 16.0667, 80.5500),
    ('+919100000001', 'Green Chillies',        'vegetables',      'Medium-hot Guntur variety.',                               58.00, 'kg',     60, 'Ponnur', 16.0667, 80.5500),
    ('+919100000001', 'Sona Masoori Rice',     'rice-grains',     'New crop, single polished, 25 kg bags available.',         64.00, 'kg',   1200, 'Ponnur', 16.0667, 80.5500),
    ('+919100000001', 'Country Eggs',          'dairy-poultry',   'Free-range desi eggs, collected daily.',                    9.00, 'piece',  400, 'Ponnur', 16.0667, 80.5500),
    ('+919100000001', 'Curry Leaves',          'spices-herbs',    'Fresh bunches, pesticide-free.',                           20.00, 'gram',   150, 'Ponnur', 16.0667, 80.5500),
    ('+919100000001', 'Toor Dal',              'dhals-pulses',    'Sun-dried, unpolished red gram.',                         118.00, 'kg',    300, 'Ponnur', 16.0667, 80.5500),
    -- 02 Padmavathi Naidu - Tenali
    ('+919100000002', 'Ladies Finger (Okra)',  'vegetables',      'Tender, harvested every morning.',                         44.00, 'kg',     80, 'Tenali', 16.2430, 80.6400),
    ('+919100000002', 'Brinjal',               'vegetables',      'Purple round brinjal, ideal for curries.',                 36.00, 'kg',    120, 'Tenali', 16.2430, 80.6400),
    ('+919100000002', 'Banganapalli Mangoes',  'fruits',          'Seasonal, naturally ripened without carbide.',            120.00, 'kg',    300, 'Tenali', 16.2430, 80.6400),
    ('+919100000002', 'Buffalo Milk',          'dairy-poultry',   'Full-cream, delivered within 3 hours of milking.',         68.00, 'litre',  90, 'Tenali', 16.2430, 80.6400),
    ('+919100000002', 'Coriander Bunch',       'spices-herbs',    'Fresh coriander, 100 g bunches.',                          15.00, 'gram',   200, 'Tenali', 16.2430, 80.6400),
    ('+919100000002', 'Moong Dal',             'dhals-pulses',    'Split yellow moong, machine-cleaned.',                    132.00, 'kg',    180, 'Tenali', 16.2430, 80.6400),
    -- 03 Srinivasa Rao Chintala - Amaravati
    ('+919100000003', 'Bananas (Chakkarakeli)','fruits',          'Sweet local variety, sold by the dozen.',                  48.00, 'dozen',  150, 'Amaravati', 16.5131, 80.5165),
    ('+919100000003', 'Papaya',                'fruits',          'Red-flesh papaya, 1-1.5 kg each.',                         35.00, 'piece',   70, 'Amaravati', 16.5131, 80.5165),
    ('+919100000003', 'Drumsticks',            'vegetables',      'Long tender drumsticks, farm fresh.',                      60.00, 'kg',     45, 'Amaravati', 16.5131, 80.5165),
    ('+919100000003', 'BPT Rice',              'rice-grains',     'Samba Masuri (BPT 5204), aged 6 months.',                  58.00, 'kg',    900, 'Amaravati', 16.5131, 80.5165),
    ('+919100000003', 'Country Chicken',       'dairy-poultry',   'Natu kodi, live weight, dressed on request.',             320.00, 'kg',     40, 'Amaravati', 16.5131, 80.5165),
    ('+919100000003', 'Turmeric Powder',       'spices-herbs',    'Home-ground from farm-grown rhizomes.',                   240.00, 'kg',     50, 'Amaravati', 16.5131, 80.5165),
    -- 04 Anjamma Koppula - Tadikonda
    ('+919100000004', 'Bottle Gourd',          'vegetables',      'Medium size, 1-1.5 kg each.',                              25.00, 'piece',   90, 'Tadikonda', 16.4427, 80.4553),
    ('+919100000004', 'Ridge Gourd',           'vegetables',      'Fresh beerakaya, tender.',                                 38.00, 'kg',     70, 'Tadikonda', 16.4427, 80.4553),
    ('+919100000004', 'Guava',                 'fruits',          'Lucknow-49 variety, crunchy and sweet.',                   55.00, 'kg',    110, 'Tadikonda', 16.4427, 80.4553),
    ('+919100000004', 'Black Gram (Urad)',     'dhals-pulses',    'Whole black gram for idli/dosa batter.',                  128.00, 'kg',    200, 'Tadikonda', 16.4427, 80.4553),
    ('+919100000004', 'Curd (Perugu)',         'dairy-poultry',   'Set curd from buffalo milk, 1 litre pots.',                60.00, 'litre',  40, 'Tadikonda', 16.4427, 80.4553),
    ('+919100000004', 'Mint Leaves',           'spices-herbs',    'Pudina, fresh bunches.',                                   12.00, 'gram',   120, 'Tadikonda', 16.4427, 80.4553),
    -- 05 Nagendra Babu Kolli - Chilakaluripet
    ('+919100000005', 'Red Chilli (Dry)',      'spices-herbs',    'Teja variety, sun-dried, high pungency.',                 210.00, 'kg',    500, 'Chilakaluripet', 16.0892, 80.1672),
    ('+919100000005', 'Cotton-seed Cattle Feed','sheep-livestock','Pressed cake for milch animals, 50 kg bags.',              28.00, 'kg',   2000, 'Chilakaluripet', 16.0892, 80.1672),
    ('+919100000005', 'Nellore Sheep',         'sheep-livestock', 'Healthy 8-10 month old rams, vaccinated.',              9500.00, 'piece',  12, 'Chilakaluripet', 16.0892, 80.1672),
    ('+919100000005', 'Onions',                'vegetables',      'Red onions, medium bulbs, well cured.',                    28.00, 'kg',    800, 'Chilakaluripet', 16.0892, 80.1672),
    ('+919100000005', 'Chana Dal',             'dhals-pulses',    'Bengal gram split, clean and uniform.',                    96.00, 'kg',    350, 'Chilakaluripet', 16.0892, 80.1672),
    ('+919100000005', 'Groundnuts',            'dhals-pulses',    'Raw shelled groundnuts, new harvest.',                    110.00, 'kg',    400, 'Chilakaluripet', 16.0892, 80.1672),
    -- 06 Bhavani Pulipati - Narasaraopet
    ('+919100000006', 'Sweet Lime (Mosambi)',  'fruits',          'Juicy, thin-skinned, 8-10 per kg.',                        52.00, 'kg',    260, 'Narasaraopet', 16.2349, 80.0490),
    ('+919100000006', 'Pomegranate',           'fruits',          'Bhagwa variety, deep red arils.',                         140.00, 'kg',     90, 'Narasaraopet', 16.2349, 80.0490),
    ('+919100000006', 'Cluster Beans',         'vegetables',      'Goru chikkudu, tender pods.',                              46.00, 'kg',     50, 'Narasaraopet', 16.2349, 80.0490),
    ('+919100000006', 'Jowar (Sorghum)',       'rice-grains',     'White jowar, ideal for rotis.',                            52.00, 'kg',    600, 'Narasaraopet', 16.2349, 80.0490),
    ('+919100000006', 'Ghee',                  'dairy-poultry',   'Hand-churned buffalo ghee, 500 ml jars.',                 720.00, 'litre',  25, 'Narasaraopet', 16.2349, 80.0490),
    ('+919100000006', 'Tamarind',              'spices-herbs',    'Seedless, last season, well dried.',                      160.00, 'kg',    120, 'Narasaraopet', 16.2349, 80.0490),
    -- 07 Mallikarjuna Yadav - Bapatla
    ('+919100000007', 'Coconuts',              'fruits',          'Mature coconuts, 400-500 g flesh each.',                   22.00, 'piece',  500, 'Bapatla', 15.9045, 80.4674),
    ('+919100000007', 'Tender Coconut',        'fruits',          'Sweet water, chilled on request.',                         35.00, 'piece',  300, 'Bapatla', 15.9045, 80.4674),
    ('+919100000007', 'Cashew Nuts',           'dhals-pulses',    'W320 grade, farm processed.',                             780.00, 'kg',     60, 'Bapatla', 15.9045, 80.4674),
    ('+919100000007', 'Ponni Rice',            'rice-grains',     'Coastal Ponni, aged one year.',                            62.00, 'kg',    700, 'Bapatla', 15.9045, 80.4674),
    ('+919100000007', 'Duck Eggs',             'dairy-poultry',   'Large duck eggs from free-ranging flock.',                 12.00, 'piece',  200, 'Bapatla', 15.9045, 80.4674),
    ('+919100000007', 'Spinach (Palak)',       'vegetables',      'Fresh palak bunches, 250 g.',                              18.00, 'gram',   140, 'Bapatla', 15.9045, 80.4674),
    -- 08 Saraswathi Gorantla - Vijayawada
    ('+919100000008', 'Cabbage',               'vegetables',      'Firm heads, 1 kg average.',                                24.00, 'kg',    150, 'Vijayawada', 16.5062, 80.6480),
    ('+919100000008', 'Cauliflower',           'vegetables',      'White compact curds.',                                     30.00, 'piece',  120, 'Vijayawada', 16.5062, 80.6480),
    ('+919100000008', 'Carrots',               'vegetables',      'Ooty carrots, sweet and crunchy.',                         48.00, 'kg',    100, 'Vijayawada', 16.5062, 80.6480),
    ('+919100000008', 'Idli Rice',             'rice-grains',     'Parboiled short grain for soft idlis.',                    54.00, 'kg',    500, 'Vijayawada', 16.5062, 80.6480),
    ('+919100000008', 'Paneer',                'dairy-poultry',   'Fresh cow-milk paneer, made to order.',                   360.00, 'kg',     30, 'Vijayawada', 16.5062, 80.6480),
    ('+919100000008', 'Masoor Dal',            'dhals-pulses',    'Red lentils, quick cooking.',                              98.00, 'kg',    220, 'Vijayawada', 16.5062, 80.6480),
    -- 09 Krishna Murthy Vemuri - Gudivada
    ('+919100000009', 'Sapota (Chikoo)',       'fruits',          'Sweet, ripe sapota, 12-14 per kg.',                        60.00, 'kg',     80, 'Gudivada', 16.4344, 80.9946),
    ('+919100000009', 'Watermelon',            'fruits',          'Kiran variety, 3-4 kg each, very sweet.',                  45.00, 'piece',  200, 'Gudivada', 16.4344, 80.9946),
    ('+919100000009', 'Pumpkin',               'vegetables',      'Yellow pumpkin, sold whole (2-3 kg).',                     40.00, 'piece',   60, 'Gudivada', 16.4344, 80.9946),
    ('+919100000009', 'Broken Rice (Nooka)',   'rice-grains',     'For upma and pongal, 10 kg bags.',                         38.00, 'kg',    400, 'Gudivada', 16.4344, 80.9946),
    ('+919100000009', 'Goat (Live)',           'sheep-livestock', 'Jamunapari cross, 12-15 kg live weight.',               7800.00, 'piece',   8, 'Gudivada', 16.4344, 80.9946),
    ('+919100000009', 'Garlic',                'spices-herbs',    'Large clove garlic, well dried.',                         150.00, 'kg',     90, 'Gudivada', 16.4344, 80.9946),
    -- 10 Rajeswari Tummala - Nuzvid
    ('+919100000010', 'Nuzvid Rasalu Mangoes', 'fruits',          'GI-tagged Nuzvid mangoes, tree-ripened.',                 160.00, 'kg',    250, 'Nuzvid', 16.7880, 80.8460),
    ('+919100000010', 'Jackfruit',             'fruits',          'Whole jackfruit, 8-10 kg, ripe.',                          30.00, 'kg',     40, 'Nuzvid', 16.7880, 80.8460),
    ('+919100000010', 'Bitter Gourd',          'vegetables',      'Kakarakaya, medium size.',                                 42.00, 'kg',     65, 'Nuzvid', 16.7880, 80.8460),
    ('+919100000010', 'Cashew Apple Jam',      'spices-herbs',    'Home-made, 250 g jars, no preservatives.',                180.00, 'piece',  40, 'Nuzvid', 16.7880, 80.8460),
    ('+919100000010', 'Foxtail Millet',        'rice-grains',     'Korralu, hulled, organic.',                                90.00, 'kg',    150, 'Nuzvid', 16.7880, 80.8460),
    ('+919100000010', 'Horse Gram',            'dhals-pulses',    'Ulavalu, whole, sun-dried.',                               84.00, 'kg',    180, 'Nuzvid', 16.7880, 80.8460),
    -- 11 Chandra Sekhar Reddy - Eluru
    ('+919100000011', 'Oil Palm Fresh Fruit',  'fruits',          'For local mills, bunches of 15-20 kg.',                    14.00, 'kg',   3000, 'Eluru', 16.7107, 81.0952),
    ('+919100000011', 'Sweet Corn',            'vegetables',      'Fresh cobs, harvested same day.',                          12.00, 'piece',  400, 'Eluru', 16.7107, 81.0952),
    ('+919100000011', 'Green Peas',            'vegetables',      'Shelled on request.',                                      70.00, 'kg',     50, 'Eluru', 16.7107, 81.0952),
    ('+919100000011', 'Swarna Rice',           'rice-grains',     'MTU 7029, boiled rice.',                                   46.00, 'kg',   1500, 'Eluru', 16.7107, 81.0952),
    ('+919100000011', 'Cow Milk',              'dairy-poultry',   'A2 desi cow milk, morning delivery.',                      72.00, 'litre',  60, 'Eluru', 16.7107, 81.0952),
    ('+919100000011', 'Black Pepper',          'spices-herbs',    'Sun-dried Malabar-type peppercorns.',                     620.00, 'kg',     25, 'Eluru', 16.7107, 81.0952),
    -- 12 Durga Prasad Mekala - Machilipatnam
    ('+919100000012', 'Prawns (Vannamei)',     'sheep-livestock', 'Farm-raised, 30-40 count, iced.',                         420.00, 'kg',     80, 'Machilipatnam', 16.1875, 81.1389),
    ('+919100000012', 'Rohu Fish',             'sheep-livestock', 'Pond-raised rohu, 1-1.5 kg each.',                        180.00, 'kg',    120, 'Machilipatnam', 16.1875, 81.1389),
    ('+919100000012', 'Cucumber',              'vegetables',      'Green salad cucumber, crisp.',                             26.00, 'kg',    140, 'Machilipatnam', 16.1875, 81.1389),
    ('+919100000012', 'Raw Banana',            'vegetables',      'Cooking bananas, sold per dozen.',                         40.00, 'dozen',  60, 'Machilipatnam', 16.1875, 81.1389),
    ('+919100000012', 'Rock Salt',             'spices-herbs',    'Sea salt crystals, unrefined.',                            18.00, 'kg',    500, 'Machilipatnam', 16.1875, 81.1389),
    ('+919100000012', 'Green Gram (Whole)',    'dhals-pulses',    'Pesarlu, for sprouts and pesarattu.',                     124.00, 'kg',    160, 'Machilipatnam', 16.1875, 81.1389),
    -- 13 Suryakantham Bonthu - Kakinada
    ('+919100000013', 'Kakinada Kaja',         'spices-herbs',    'Traditional sweet, 500 g boxes, made fresh.',             220.00, 'piece',  50, 'Kakinada', 16.9891, 82.2475),
    ('+919100000013', 'Pineapple',             'fruits',          'Queen variety, sweet and fibre-light.',                    40.00, 'piece',  120, 'Kakinada', 16.9891, 82.2475),
    ('+919100000013', 'Elephant Yam',          'vegetables',      'Kanda, 2-4 kg tubers.',                                    34.00, 'kg',    100, 'Kakinada', 16.9891, 82.2475),
    ('+919100000013', 'Ragi (Finger Millet)',  'rice-grains',     'Whole ragi, machine cleaned.',                             56.00, 'kg',    300, 'Kakinada', 16.9891, 82.2475),
    ('+919100000013', 'Quail Eggs',            'dairy-poultry',   'Sold in trays of 30.',                                      4.00, 'piece', 1500, 'Kakinada', 16.9891, 82.2475),
    ('+919100000013', 'Rajma (Kidney Beans)',  'dhals-pulses',    'Red kidney beans, uniform size.',                         140.00, 'kg',    120, 'Kakinada', 16.9891, 82.2475),
    -- 14 Hanumantha Rao Pasupuleti - Rajahmundry
    ('+919100000014', 'Custard Apple',         'fruits',          'Sitaphal, large and sweet.',                               80.00, 'kg',     70, 'Rajahmundry', 17.0005, 81.8040),
    ('+919100000014', 'Amla (Gooseberry)',     'fruits',          'Big-size amla for pickles and juice.',                     45.00, 'kg',    150, 'Rajahmundry', 17.0005, 81.8040),
    ('+919100000014', 'Beetroot',              'vegetables',      'Deep red, medium bulbs.',                                  36.00, 'kg',     90, 'Rajahmundry', 17.0005, 81.8040),
    ('+919100000014', 'Bamboo Rice',           'rice-grains',     'Rare forest-collected bamboo rice.',                      260.00, 'kg',     30, 'Rajahmundry', 17.0005, 81.8040),
    ('+919100000014', 'Honey (Forest)',        'spices-herbs',    'Raw multi-flora honey, 500 ml bottles.',                  380.00, 'piece',  45, 'Rajahmundry', 17.0005, 81.8040),
    ('+919100000014', 'Turkey Birds',          'dairy-poultry',   'Live turkeys, 5-6 kg, farm raised.',                    1800.00, 'piece',  15, 'Rajahmundry', 17.0005, 81.8040),
    -- 15 Yellamma Gundu - Warangal
    ('+919100000015', 'Warangal Chilli',       'spices-herbs',    'Wonder Hot variety, dried pods.',                         195.00, 'kg',    600, 'Warangal', 17.9689, 79.5941),
    ('+919100000015', 'Sesame Seeds',          'dhals-pulses',    'White sesame, cold-press quality.',                       190.00, 'kg',    200, 'Warangal', 17.9689, 79.5941),
    ('+919100000015', 'Maize (Corn Grain)',    'rice-grains',     'Yellow maize, dried, 50 kg bags.',                         24.00, 'kg',   2500, 'Warangal', 17.9689, 79.5941),
    ('+919100000015', 'Sheep Manure',          'sheep-livestock', 'Composted, ideal for kitchen gardens, 25 kg bags.',        10.00, 'kg',   4000, 'Warangal', 17.9689, 79.5941),
    ('+919100000015', 'Lemons',                'fruits',          'Thin-skinned juicy lemons, 30-35 per kg.',                 60.00, 'kg',    130, 'Warangal', 17.9689, 79.5941),
    ('+919100000015', 'Green Beans (French)',  'vegetables',      'Tender French beans.',                                     54.00, 'kg',     55, 'Warangal', 17.9689, 79.5941),
    -- 16 Narsimha Goud - Gopanpally (about 5 km from Kondapur)
    ('+919100000016', 'Tomatoes',              'vegetables',      'Hybrid tomatoes from our polyhouse, picked this morning.',  34.00, 'kg',    180, 'Gopanpally', 17.4507, 78.3239),
    ('+919100000016', 'Spinach (Palak)',       'vegetables',      'Hydroponic palak, washed and bunched (250 g).',            22.00, 'gram',  120, 'Gopanpally', 17.4507, 78.3239),
    ('+919100000016', 'Capsicum (Mixed)',      'vegetables',      'Red, yellow and green bell peppers.',                      95.00, 'kg',     60, 'Gopanpally', 17.4507, 78.3239),
    ('+919100000016', 'Strawberries',          'fruits',          'Polyhouse strawberries, 250 g punnets.',                   90.00, 'piece',  80, 'Gopanpally', 17.4507, 78.3239),
    ('+919100000016', 'Farm Eggs',             'dairy-poultry',   'Brown eggs from cage-free hens.',                          10.00, 'piece', 600, 'Gopanpally', 17.4507, 78.3239),
    ('+919100000016', 'Basil & Mint Box',      'spices-herbs',    'Fresh herb box: basil, mint, coriander (300 g).',          70.00, 'piece',  40, 'Gopanpally', 17.4507, 78.3239),
    -- 17 Sujatha Rani - Patancheru (about 14 km from Kondapur)
    ('+919100000017', 'Sona Masoori Rice',     'rice-grains',     'Old crop Sona Masoori, 26 kg bags, home delivery.',        66.00, 'kg',   1500, 'Patancheru', 17.5301, 78.2646),
    ('+919100000017', 'Toor Dal',              'dhals-pulses',    'Unpolished kandi pappu from our own fields.',             120.00, 'kg',    400, 'Patancheru', 17.5301, 78.2646),
    ('+919100000017', 'Buffalo Milk',          'dairy-poultry',   'Farm-fresh, delivered in glass bottles by 7 am.',          70.00, 'litre', 120, 'Patancheru', 17.5301, 78.2646),
    ('+919100000017', 'Curd (Perugu)',         'dairy-poultry',   'Thick set curd, 500 ml and 1 litre.',                      62.00, 'litre',  60, 'Patancheru', 17.5301, 78.2646),
    ('+919100000017', 'Onions',                'vegetables',      'Red onions, medium size, well cured.',                     30.00, 'kg',    700, 'Patancheru', 17.5301, 78.2646),
    ('+919100000017', 'Guava',                 'fruits',          'Allahabad safeda, crunchy and sweet.',                     58.00, 'kg',     90, 'Patancheru', 17.5301, 78.2646),
    -- 18 Balaraju Mudiraj - Moinabad (about 17 km from Kondapur)
    ('+919100000018', 'Country Chicken',       'dairy-poultry',   'Natu kodi raised on open range, dressed on order.',       340.00, 'kg',     35, 'Moinabad', 17.3355, 78.2830),
    ('+919100000018', 'Goat (Live)',           'sheep-livestock', 'Osmanabadi goats, 12-15 kg, vaccinated.',               8200.00, 'piece',  10, 'Moinabad', 17.3355, 78.2830),
    ('+919100000018', 'Banganapalli Mangoes',  'fruits',          'Naturally ripened, no carbide, from our orchard.',        130.00, 'kg',    250, 'Moinabad', 17.3355, 78.2830),
    ('+919100000018', 'Watermelon',            'fruits',          'Sweet kiran melons, 3-4 kg each.',                         42.00, 'piece', 150, 'Moinabad', 17.3355, 78.2830),
    ('+919100000018', 'Green Chillies',        'vegetables',      'Medium-hot, freshly picked.',                              55.00, 'kg',     70, 'Moinabad', 17.3355, 78.2830),
    ('+919100000018', 'Jowar (Sorghum)',       'rice-grains',     'White jowar for rotis, stone-ground flour on request.',    54.00, 'kg',    500, 'Moinabad', 17.3355, 78.2830)
) AS p(farmer_phone, name, category, description, price, unit, quantity, place, lat, lng)
JOIN f2home_users u ON u.phone_number = p.farmer_phone;

COMMIT;

-- ---------------------------------------------------------------- SUMMARY
SELECT role, count(*) AS users FROM f2home_users GROUP BY role ORDER BY role;

SELECT u.full_name AS farmer, count(p.id) AS products, min(p.location_label) AS place
  FROM f2home_users u
  LEFT JOIN f2home_products p ON p.farmer_id = u.id AND p.status = 'ACTIVE'
 WHERE u.role = 'FARMER'
 GROUP BY u.id, u.full_name
 ORDER BY u.full_name;
