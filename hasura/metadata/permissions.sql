CREATE POLICY "Public can view published pictures" ON "pictures"
  FOR SELECT
  USING (is_published = true);

CREATE POLICY "Authors can manage their pictures" ON "pictures"
  FOR ALL
  USING (
    collection_id IN (
      SELECT collection_id 
      FROM collection_authors 
      WHERE author_id = current_setting('hasura.user.id')::integer
    )
  );

CREATE POLICY "Admins have full access to pictures" ON "pictures"
  FOR ALL
  USING (
    current_setting('hasura.user.role') = 'admin'
  );


CREATE POLICY "Public can view collections" ON "collections"
  FOR SELECT
  USING (true);

CREATE POLICY "Authors can view collections" ON "collections"
  FOR SELECT
  USING (true);

CREATE POLICY "Admins have full access to collections" ON "collections"
  FOR ALL
  USING (
    current_setting('hasura.user.role') = 'admin'
  );

CREATE POLICY "Admins have full access to authors" ON "authors"
  FOR ALL
  USING (
    current_setting('hasura.user.role') = 'admin'
  );

CREATE POLICY "Public can view authors" ON "authors"
  FOR SELECT
  USING (true);
