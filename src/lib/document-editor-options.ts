import type { Editor, JSONContent } from '@tiptap/core';
import type { Extensions } from '@tiptap/core';
import type { DocumentPaginationOptions } from './extensions/DocumentPagination.js';
import type { PageFormatKey } from './page-geometry.js';
import type { TemplateVariableDefinition } from './template-variables.js';

export type DocumentEditorContent = string | JSONContent;
export type DocumentEditorMode = 'editor' | 'template' | 'readonly';
export type DocumentEditorContentFormat = 'html' | 'json';

export interface DocumentEditorPageOptions {
	format?: PageFormatKey;
	pagination?: Partial<DocumentPaginationOptions>;
}

export interface DocumentEditorClasses {
	root?: string;
	pageArea?: string;
}

export interface DocumentEditorTemplateOptions {
	fields?: TemplateVariableDefinition[];
}

export type DocumentEditorPayload = {
	content: DocumentEditorContent;
	html: string;
	json: JSONContent;
	editor: Editor;
};

export type DocumentEditorUpdateHandler = (payload: DocumentEditorPayload) => void;
export type DocumentEditorSaveHandler = (payload: DocumentEditorPayload) => void | Promise<void>;

export interface DocumentEditorCommonProps {
	extensions?: Extensions;
	page?: DocumentEditorPageOptions;
	classes?: DocumentEditorClasses;
	template?: DocumentEditorTemplateOptions;
	onUpdate?: DocumentEditorUpdateHandler;
	onSave?: DocumentEditorSaveHandler;
	onPrint?: () => void;
}
