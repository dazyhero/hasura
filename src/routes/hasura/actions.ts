import { FastifyInstance } from 'fastify';
import { uploadImageToImgur } from '../../services/imgur';
import { validateHasuraAction } from '../../middleware/hasura';
import { db } from '../../db/index';
import { Collections, collections, collection_authors, authors, pictures, tags, picture_tags } from '../../db/schema';
import { HasuraActionPayload } from '../../types/hasura';
import { and, eq, inArray } from 'drizzle-orm';

interface CreateCollectionInput extends Collections {
  admin_ids?: number[];
}

interface CreateAuthorInput {
  email: string;
}

interface AssignAuthorsInput {
  collection_id: number;
  author_ids: number[];
  is_admin?: boolean;
}

interface AddImageInput {
  collection_id: number;
  url: string;
  is_published?: boolean;
  tags?: string[];
}

interface UpdateImageInput {
  picture_id: number;
  is_published?: boolean;
  tags?: string[];
}

export async function hasuraActionRoutes(fastify: FastifyInstance) {
  // Register multipart plugin for file uploads
  await fastify.register(import('@fastify/multipart'), {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
  });

  // Upload Image Action
  fastify.post(
    '/upload-image',
    {
      preHandler: validateHasuraAction,
    },
    async (request, reply) => {
      try {
        // Get the operations field from form data
        const form = request.parts();
        let operations;
        let input;

        for await (const part of form) {
          if (part.type === 'field' && part.fieldname === 'operations') {
            operations = JSON.parse(part.value as string);
            input = operations.variables;
            break;
          }
        }

        if (!operations || !input) {
          throw new Error('Missing operations in form data');
        }

        const authorId = request.user.id;

        // Verify author has access to collection
        const authorAccess = await db
          .select()
          .from(collection_authors)
          .where(and(
            eq(collection_authors.collection_id, input.collection_id),
            eq(collection_authors.author_id, authorId)
          ))
          .limit(1);

        if (!authorAccess.length) {
          reply.code(403).send({
            message: 'You do not have access to this collection',
            extensions: {
              code: 'COLLECTION_ACCESS_ERROR',
            },
          });
          return;
        }

        // Get the uploaded file
        const file = await request.file();
        if (!file) {
          reply.code(400).send({
            message: 'No file uploaded',
            extensions: {
              code: 'FILE_UPLOAD_ERROR',
            },
          });
          return;
        }

        // Validate file type
        if (!file.mimetype.startsWith('image/')) {
          reply.code(400).send({
            message: 'Only image files are allowed',
            extensions: {
              code: 'INVALID_FILE_TYPE',
            },
          });
          return;
        }

        // Convert file to buffer
        const buffer = await file.toBuffer();

        // Upload to Imgur
        const imageUrl = await uploadImageToImgur(buffer);

        return await db.transaction(async (tx) => {
          // Create picture
          const [picture] = await tx
            .insert(pictures)
            .values({
              collection_id: input.collection_id,
              image_url: imageUrl,
              is_published: input.is_published ?? false,
              author_id: authorId
            })
            .returning();

          // Add tags if provided
          if (input.tags && input.tags.length > 0) {
            // First ensure tags exist
            const tagRecords = await Promise.all(
              input.tags.map(async (tagName: string) => {
                const [tag] = await tx
                  .insert(tags)
                  .values({ name: tagName })
                  .onConflictDoUpdate({
                    target: tags.name,
                    set: { name: tagName }
                  })
                  .returning();
                return tag;
              })
            );

            // Link tags to picture
            await tx
              .insert(picture_tags)
              .values(
                tagRecords.map(tag => ({
                  picture_id: picture.id,
                  tag_id: tag.id
                }))
              );
          }

          return {
            picture_id: picture.id,
            url: picture.image_url,
            is_published: picture.is_published,
            tags: input.tags || []
          };
        });
      } catch (error) {
        console.error('Error uploading image:', error);
        reply.code(400).send({
          message: error instanceof Error ? error.message : 'Failed to upload image',
          extensions: {
            code: 'IMAGE_UPLOAD_ERROR',
          },
        });
      }
    }
  );
  // Add Image Action
  fastify.post<{
    Body: HasuraActionPayload<AddImageInput>;
  }>(
    '/add-image',
    {
      preHandler: validateHasuraAction,
    },
    async (request, reply) => {
      try {
        const { input } = request.body;
        const authorId = request.user.id

        // Verify author has access to collection
        const authorAccess = await db
          .select()
          .from(collection_authors)
          .where(and(
            eq(collection_authors.collection_id, input.collection_id),
            eq(collection_authors.author_id, authorId)
          ))
          .limit(1);

        if (!authorAccess.length) {
          reply.code(403).send({
            message: 'You do not have access to this collection',
            extensions: {
              code: 'COLLECTION_ACCESS_ERROR',
            },
          });
          return;
        }

        return await db.transaction(async (tx) => {
          // Create picture
          const [picture] = await tx
            .insert(pictures)
            .values({
              collection_id: input.collection_id,
              image_url: input.url,
              is_published: input.is_published,
              author_id: authorId
            })
            .returning();

          // Add tags if provided
          if (input.tags && input.tags.length > 0) {
            // First ensure tags exist
            const tagRecords = await Promise.all(
              input.tags.map(async (tagName) => {
                const [tag] = await tx
                  .insert(tags)
                  .values({ name: tagName })
                  .onConflictDoUpdate({
                    target: tags.name,
                    set: { name: tagName }
                  })
                  .returning();
                return tag;
              })
            );

            // Link tags to picture
            await tx
              .insert(picture_tags)
              .values(
                tagRecords.map(tag => ({
                  picture_id: picture.id,
                  tag_id: tag.id
                }))
              );
          }

          return {
            picture_id: picture.id,
            url: picture.image_url,
            is_published: picture.is_published,
            tags: input.tags || []
          };
        });
      } catch (error) {
        console.error('Error adding image:', error);
        reply.code(400).send({
          message: error instanceof Error ? error.message : 'Failed to add image',
          extensions: {
            code: 'ADD_IMAGE_ERROR',
          },
        });
      }
    }
  );

  // Update Image Action
  fastify.post<{
    Body: HasuraActionPayload<UpdateImageInput>;
  }>(
    '/update-image',
    {
      preHandler: validateHasuraAction,
    },
    async (request, reply) => {
      try {
        const { input } = request.body;
        const authorId = request.user.id

        // Get picture and verify author has access to its collection
        const picture = await db
          .select({
            picture: pictures,
            access: collection_authors
          })
          .from(pictures)
          .innerJoin(
            collection_authors,
            and(
              eq(collection_authors.collection_id, pictures.collection_id),
              eq(collection_authors.author_id, authorId)
            )
          )
          .where(eq(pictures.id, input.picture_id))
          .limit(1);

        if (!picture.length) {
          throw new Error('Picture not found or you do not have access');
        }

        return await db.transaction(async (tx) => {
          // Update picture status if provided
          if (input.is_published) {
            await tx
              .update(pictures)
              .set({ is_published: input.is_published })
              .where(eq(pictures.id, input.picture_id));
          }

          // Update tags if provided
          if (input.tags) {
            // Remove existing tags
            await tx
              .delete(picture_tags)
              .where(eq(picture_tags.picture_id, input.picture_id));

            // Add new tags
            const tagRecords = await Promise.all(
              input.tags.map(async (tagName) => {
                const [tag] = await tx
                  .insert(tags)
                  .values({ name: tagName })
                  .onConflictDoUpdate({
                    target: tags.name,
                    set: { name: tagName }
                  })
                  .returning();
                return tag;
              })
            );

            // Link new tags to picture
            await tx
              .insert(picture_tags)
              .values(
                tagRecords.map(tag => ({
                  picture_id: input.picture_id,
                  tag_id: tag.id
                }))
              );
          }

          return {
            picture_id: input.picture_id,
            is_published: input.is_published,
            tags: input.tags,
            success: true
          };
        });
      } catch (error) {
        console.error('Error updating image:', error);
        reply.code(400).send({
          message: error instanceof Error ? error.message : 'Failed to update image',
          extensions: {
            code: 'UPDATE_IMAGE_ERROR',
          },
        });
      }
    }
  );
  fastify.post<{
    Body: HasuraActionPayload<AssignAuthorsInput>;
  }>(
    '/assign-authors',
    {
      preHandler: validateHasuraAction,
    },
    async (request, reply) => {
      try {
        const { input } = request.body;
        const sessionVars = request.body.session_variables;

        if (sessionVars['x-hasura-role'] !== 'admin') {
          throw new Error('Only admin users can assign authors to collections');
        }

        // Verify the collection exists
        const collection = await db
          .select()
          .from(collections)
          .where(eq(collections.id, input.collection_id))
          .limit(1);

        if (!collection.length) {
          throw new Error('Collection not found');
        }

        // Verify all authors exist
        const existingAuthors = await db
          .select()
          .from(authors)
          .where(inArray(authors.id, input.author_ids));

        if (existingAuthors.length !== input.author_ids.length) {
          throw new Error('One or more authors not found');
        }

        // Add the authors to the collection
        await db.transaction(async (tx) => {
          // First, remove any existing relationships for these authors with this collection
          await tx
            .delete(collection_authors)
            .where(and(
              eq(collection_authors.collection_id, input.collection_id),
              inArray(collection_authors.author_id, input.author_ids)
            ))

          // Then insert the new relationships
          await tx
            .insert(collection_authors)
            .values(
              input.author_ids.map(author_id => ({
                collection_id: input.collection_id,
                author_id: author_id,
                is_admin: input.is_admin || false
              }))
            );
        });

        return {
          collection_id: input.collection_id,
          author_ids: input.author_ids,
          success: true
        };
      } catch (error) {
        console.error('Error assigning authors:', error);
        reply.code(400).send({
          message: error instanceof Error ? error.message : 'Failed to assign authors',
          extensions: {
            code: 'ASSIGN_AUTHORS_ERROR',
          },
        });
      }
    }
  );
  fastify.post<{
    Body: HasuraActionPayload<CreateAuthorInput>;
  }>(
    '/create-author',
    {
      preHandler: validateHasuraAction,
    },
    async (request, reply) => {
      try {
        const { input } = request.body;
        const sessionVars = request.body.session_variables;

        if (sessionVars['x-hasura-role'] !== 'admin') {
          throw new Error('Only admin users can create authors');
        }

        // Create the author
        const [newAuthor] = await db
          .insert(authors)
          .values({
            role: 'author',
            email: input.email,
          })
          .returning();

        return {
          author_id: newAuthor.id,
          email: newAuthor.email,
        };
      } catch (error) {
        console.error('Error creating author:', error);
        reply.code(400).send({
          message: error instanceof Error ? error.message : 'Failed to create author',
          extensions: {
            code: 'AUTHOR_CREATE_ERROR',
          },
        });
      }
    }
  );
  fastify.post<{
    Body: HasuraActionPayload<CreateCollectionInput>;
  }>(
    '/create-collection',
    {
      preHandler: validateHasuraAction,
    },
    async (request, reply) => {
      try {
        const { input } = request.body;
        const sessionVars = request.body.session_variables;

        if (sessionVars['x-hasura-role'] !== 'admin') {
          throw new Error('Only admin users can create collections');
        }

        // Create the collection and link it to the author in a transaction
        const [newCollection] = await db.transaction(async (tx) => {
          // Create collection
          const [collection] = await tx
            .insert(collections)
            .values({
              name: input.name,
            })
            .returning();

          // Link collection to additional admin authors if provided
          if (input.admin_ids && input.admin_ids.length > 0) {
            await tx
              .insert(collection_authors)
              .values(
                input.admin_ids
                  .map(admin_id => ({
                    collection_id: collection.id,
                    author_id: admin_id,
                    is_admin: true
                  }))
              );
          }

          return [collection];
        });

        return {
          collection_id: newCollection.id,
          name: newCollection.name,
        };
      } catch (error) {
        console.error('Error creating collection:', error);
        reply.code(400).send({
          message: error instanceof Error ? error.message : 'Failed to create collection',
          extensions: {
            code: 'COLLECTION_CREATE_ERROR',
          },
        });
      }
    }
  );
}

