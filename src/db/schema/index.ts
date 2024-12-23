import { sql } from "drizzle-orm";
import { pgTable, serial, varchar, integer, timestamp, text, boolean, unique, index, pgMaterializedView } from "drizzle-orm/pg-core";

export const authors = pgTable("authors", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  role: varchar("role", { length: 255 }).notNull().$type<'admin' | 'author' | 'public'>(),
});

export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
});

export const collection_authors = pgTable("collection_authors", {
  collection_id: integer("collection_id")
    .notNull()
    .references(() => collections.id, { onDelete: "cascade" }),
  author_id: integer("author_id")
    .notNull()
    .references(() => authors.id, { onDelete: "cascade" }),
}, (table) => ({
  unique_author_collection: unique().on(table.author_id, table.collection_id)
}));

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).unique().notNull(),
});

export const pictures = pgTable("pictures", {
  id: serial("id").primaryKey(),
  image_url: text("image_url").notNull(),
  author_id: integer("author_id")
    .notNull()
    .references(() => authors.id, { onDelete: "cascade" }),
  created_at: timestamp("created_at").defaultNow().notNull(),
  is_published: boolean("is_published").default(true).notNull(),
  collection_id: integer("collection_id")
    .notNull()
    .references(() => collections.id, { onDelete: "set null" }),
}, (table) => ({
  idx_author: index('idx_pictures_author').on(table.author_id),
  idx_collection: index('idx_pictures_collection').on(table.collection_id),
  idx_published: index('idx_pictures_published').on(table.is_published)
}));

export const picture_tags = pgTable("picture_tags", {
  picture_id: integer("picture_id")
    .notNull()
    .references(() => pictures.id, { onDelete: "cascade" }),
  tag_id: integer("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
}, (table) => ({
  unique_picture_tag: unique().on(table.picture_id, table.tag_id),
  idx_tag: index('idx_picture_tags_tag').on(table.tag_id)
}));

export const pictureSearchView = pgMaterializedView('picture_search_view', {
  id: integer('id'),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at', { withTimezone: true }),
  collectionId: integer('collection_id'),
  authorId: integer('author_id'),
  isPublished: boolean('is_published'),
  tagNames: text('tag_names').array(),
  tagIds: integer('tag_ids').array()
} as const).as(sql`
  SELECT 
    p.id,
    p.image_url,
    p.created_at,
    p.collection_id,
    p.author_id,
    p.is_published,
    array_agg(DISTINCT t.name) as tag_names,
    array_agg(DISTINCT t.id) as tag_ids
  FROM pictures p
  LEFT JOIN picture_tags pt ON p.id = pt.picture_id
  LEFT JOIN tags t ON pt.tag_id = t.id
  GROUP BY 
    p.id,
    p.image_url,
    p.created_at,
    p.collection_id,
    p.author_id,
    p.is_published
`);

export const pictureSearchViewIndexes = {
  tagNames: sql`CREATE INDEX idx_picture_search_tags ON ${pictureSearchView} USING gin(tag_names)`,
  collectionId: sql`CREATE INDEX idx_picture_search_collection ON ${pictureSearchView}(collection_id)`,
  authorId: sql`CREATE INDEX idx_picture_search_author ON ${pictureSearchView}(author_id)`
};


export type Authors = typeof authors.$inferInsert;
export type Collections = typeof collections.$inferInsert;
export type CollectionAuthors = typeof collection_authors.$inferInsert;
export type Tags = typeof tags.$inferInsert;
export type Pictures = typeof pictures.$inferInsert;
export type PictureTags = typeof picture_tags.$inferInsert;
