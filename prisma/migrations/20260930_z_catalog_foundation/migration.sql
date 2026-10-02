INSERT INTO "categories" ("id", "name", "slug", "sortOrder", "isActive", "createdAt", "updatedAt")
VALUES ('be-gai', 'Thời trang bé gái', 'be-gai', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
