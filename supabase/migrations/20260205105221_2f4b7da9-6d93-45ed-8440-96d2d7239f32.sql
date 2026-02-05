-- Add PEN product fields to chamados table
ALTER TABLE public.chamados 
ADD COLUMN pen_produto TEXT,
ADD COLUMN pen_modulo TEXT,
ADD COLUMN pen_po TEXT,
ADD COLUMN pen_po_substituto TEXT,
ADD COLUMN pen_representante_tecnico TEXT;