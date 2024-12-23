CREATE TABLE "authors" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(255) NOT NULL,
	CONSTRAINT "authors_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "collection_authors" (
	"collection_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	CONSTRAINT "collection_authors_author_id_collection_id_unique" UNIQUE("author_id","collection_id")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "picture_tags" (
	"picture_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "picture_tags_picture_id_tag_id_unique" UNIQUE("picture_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "pictures" (
	"id" serial PRIMARY KEY NOT NULL,
	"image_url" text NOT NULL,
	"author_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"collection_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "collection_authors" ADD CONSTRAINT "collection_authors_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_authors" ADD CONSTRAINT "collection_authors_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "picture_tags" ADD CONSTRAINT "picture_tags_picture_id_pictures_id_fk" FOREIGN KEY ("picture_id") REFERENCES "public"."pictures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "picture_tags" ADD CONSTRAINT "picture_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pictures" ADD CONSTRAINT "pictures_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pictures" ADD CONSTRAINT "pictures_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_picture_tags_tag" ON "picture_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "idx_pictures_author" ON "pictures" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_pictures_collection" ON "pictures" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "idx_pictures_published" ON "pictures" USING btree ("is_published");--> statement-breakpoint
CREATE MATERIALIZED VIEW "public"."picture_search_view" AS (
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
);