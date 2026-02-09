
-- Allow authenticated users to insert into kb_documents
CREATE POLICY "Authenticated users can insert kb_documents"
ON public.kb_documents
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to read kb_documents
CREATE POLICY "Authenticated users can read kb_documents"
ON public.kb_documents
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to delete kb_documents
CREATE POLICY "Authenticated users can delete kb_documents"
ON public.kb_documents
FOR DELETE
TO authenticated
USING (true);
