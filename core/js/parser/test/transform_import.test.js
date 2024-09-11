
import { tokenize } from '../src/tokenizer';
import { ASTNodeType, parse } from '../src/parser';
import { NodeType, transform } from '../src/transformer';
import pass_function_definition from '../src/passes/function_definition';
import pass_import from '../src/passes/import';
import operators from '../src/operators';


test('global', () => {
	const samples = [
		{
			text:	'import java.lang.Object;',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type:	NodeType.STAT_IMPORT,
						path:	[ 'java', 'lang' ],
						name:	'Object'
					}),
					expect.objectContaining({ type: ASTNodeType.DELIMIT }),
				]
			})
		},
	];

	for (const sample of samples) {
		const tokenizeResult = tokenize(sample.text);
		expect(tokenizeResult.err).toBeUndefined();

		const parseResult = parse(tokenizeResult.tokens, operators);
		expect(parseResult.err).toBeUndefined();

		const ast = parseResult.ast;
		const err = transform(ast, [ pass_import ]);
		expect(err).toBeUndefined();
		expect(ast).toEqual(sample.ast);
	}
});

test('local', () => {
	const samples = [
		{
			text:	'fn main() { import java.lang.String; }',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type:	NodeType.FUNC_DEF,
						args:	[],
						name:	'main',
						body:	expect.objectContaining({
							type:	ASTNodeType.OP_GROUP,
							nodes:	[
								expect.objectContaining({
									type:	NodeType.STAT_IMPORT,
									path:	[ 'java', 'lang' ],
									name:	'String'
								}),
							]
						})
					}),
				]
			})
		},
	];

	for (const sample of samples) {
		const tokenizeResult = tokenize(sample.text);
		expect(tokenizeResult.err).toBeUndefined();

		const parseResult = parse(tokenizeResult.tokens, operators);
		expect(parseResult.err).toBeUndefined();

		const ast = parseResult.ast;
		const err = transform(ast, [ pass_function_definition, pass_import ]);
		expect(err).toBeUndefined();
		expect(ast).toEqual(sample.ast);
	}
});
