import { reset } from "drizzle-seed";
import { db } from "./index";
import {
  authors, collections, pictures, tags, pictureSearchView,
  Authors, Collections, Tags, Pictures,
  collection_authors,
  picture_tags
} from "./schema";
import { sql } from "drizzle-orm";

// Define types for seed data (omitting id and timestamps that are auto-generated)
type AuthorSeed = Pick<Authors, 'email' | 'role'>;
type CollectionSeed = Pick<Collections, 'name'>;
type TagSeed = Pick<Tags, 'name'>;
type PictureSeed = Pick<Pictures, 'image_url' | 'collection_id' | 'author_id' | 'is_published'>;

const seedAuthors: AuthorSeed[] = [
  { email: "admin@example.com", role: "admin" },
  { email: "user1@example.com", role: "author" },
  { email: "user2@example.com", role: "public" }
];

const seedCollections: CollectionSeed[] = [
  { name: "Nature Collection" },
  { name: "Urban Collection" }
];

const seedTags: TagSeed[] = [
  { name: "nature" },
  { name: "architecture" },
  { name: "people" },
  { name: "technology" }
];

async function main(): Promise<void> {
  try {
    await reset(db, { authors, collections, collection_authors, pictures, picture_tags, tags })
    console.log("Starting database seeding...");

    // Seed authors
    console.log("Seeding authors...");
    const seededAuthors = await db.insert(authors)
      .values(seedAuthors)
      .returning();
    console.log("✓ Authors seeded:", JSON.stringify(seededAuthors, null, 2));

    // Seed collections
    console.log("Seeding collections...");
    const seededCollections = await db.insert(collections)
      .values(seedCollections)
      .returning();
    console.log("✓ Collections seeded");

    // Seed collection authors
    console.log("Seeding collection authors...");
    await db.insert(collection_authors)
      .values([
        { collection_id: seededCollections[0].id, author_id: seededAuthors[0].id },
        { collection_id: seededCollections[0].id, author_id: seededAuthors[1].id },
        { collection_id: seededCollections[1].id, author_id: seededAuthors[0].id },
        { collection_id: seededCollections[1].id, author_id: seededAuthors[2].id }
      ]);
    console.log("✓ Collection authors seeded");

    // Seed tags
    console.log("Seeding tags...");
    const seededTags = await db.insert(tags)
      .values(seedTags)
      .returning();
    console.log("✓ Tags seeded");

    // Seed pictures
    console.log("Seeding pictures...");
    const seededPictures = await db.insert(pictures)
      .values([
        {
          image_url: "nature1.jpg",
          collection_id: seededCollections[0].id,
          author_id: seededAuthors[0].id,
          is_published: true
        },
        {
          image_url: "city1.jpg",
          collection_id: seededCollections[1].id,
          author_id: seededAuthors[1].id,
          is_published: true
        },
        {
          image_url: "tech1.jpg",
          collection_id: seededCollections[1].id,
          author_id: seededAuthors[2].id,
          is_published: false
        }
      ])
      .returning();
    console.log("✓ Pictures seeded");

    // Seed picture tags
    console.log("Seeding picture tags...");
    await db.insert(picture_tags)
      .values([
        { picture_id: seededPictures[0].id, tag_id: seededTags[0].id },
        { picture_id: seededPictures[0].id, tag_id: seededTags[2].id },
        { picture_id: seededPictures[1].id, tag_id: seededTags[1].id },
        { picture_id: seededPictures[1].id, tag_id: seededTags[3].id },
        { picture_id: seededPictures[2].id, tag_id: seededTags[3].id }
      ]);
    console.log("✓ Picture tags seeded");

    // Refresh materialized view
    console.log("Refreshing materialized view...");
    await db.execute(sql`REFRESH MATERIALIZED VIEW ${pictureSearchView}`);
    console.log("✓ Materialized view refreshed");

    console.log("\n✅ Seeding completed successfully");
  } catch (error) {
    if (error instanceof Error) {
      console.error("\n❌ Seeding failed!");
      console.error("Error message:", error.message);
      console.error("Error details:", error);

      // If it's a database error, it might have additional properties
      const dbError = error as any;
      if (dbError.detail) console.error("Database error detail:", dbError.detail);
      if (dbError.schema) console.error("Schema:", dbError.schema);
      if (dbError.table) console.error("Table:", dbError.table);
      if (dbError.column) console.error("Column:", dbError.column);
    } else {
      console.error("\n❌ Seeding failed with unknown error:", error);
    }
    throw error;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

