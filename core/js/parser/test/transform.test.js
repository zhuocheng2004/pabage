
import { tokenize } from '../src/tokenizer';
import { ASTNodeType, parse } from '../src/parser';
import { NodeType, transform } from '../src/transformer';
import { standard_passes } from '../src/passes/passes';
import operators from '../src/operators';

test('simple', () => {
	const samples = [
		{
			text:	'val t = 1.23',
			ast:	expect.objectContaining({
				type:	NodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type:	NodeType.VAR_DEF,
						name:	't',
						init:	expect.objectContaining({
							type:	NodeType.LIT_NUMBER,
							value:	1.23
						})
					})
				]
			})
		},
		{
			text:	'fn main() { return 0; }',
			ast:	expect.objectContaining({
				type:	NodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type:	NodeType.FUNC_DEF,
						name:	'main',
						args:	[],
						body:	expect.objectContaining({
							type:	NodeType.CHUNK,
							nodes:	[
								expect.objectContaining({
									type:	NodeType.STAT_RETURN,
									arg:	expect.objectContaining({
										type:	NodeType.LIT_NUMBER,
										value:	0
									})
								})
							]
						})
					})
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
		const err = transform(ast, standard_passes);
		expect(err).toBeUndefined();
		expect(ast).toEqual(sample.ast);
	}
})


test('complicated', () => {
	const samples = [
		{
			text:	`
			// demo program
			val t = 1.23;

			/* demo function */
			fn main() {
				val c = cos(t);
				val s = sin(t);
				val ans = c*c + s*s;
				print(ans);

				return 0;
			}
			`,
			ast:	expect.objectContaining({
				type:	NodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type:	NodeType.VAR_DEF,
						name:	't',
						init:	expect.objectContaining({
							type:	NodeType.LIT_NUMBER,
							value:	1.23
						})
					}),
					expect.objectContaining({
						type:	NodeType.FUNC_DEF,
						name:	'main',
						args:	[],
						body:	expect.objectContaining({
							type:	NodeType.CHUNK,
							nodes:	[
								expect.objectContaining({
									type:	NodeType.VAR_DEF,
									name:	'c',
									init:	expect.objectContaining({
										type:   NodeType.EXPR_FUNC_CALL,
										func:   expect.objectContaining({
											type:   NodeType.IDENTIFIER,
											name:   'cos'
										}),
										args:   [
											expect.objectContaining({
												type:   NodeType.IDENTIFIER,
												name:   't'
											}),
										]
									})
								}),
								expect.objectContaining({
									type:	NodeType.VAR_DEF,
									name:	's',
									init:	expect.objectContaining({
										type:   NodeType.EXPR_FUNC_CALL,
										func:   expect.objectContaining({
											type:   NodeType.IDENTIFIER,
											name:   'sin'
										}),
										args:   [
											expect.objectContaining({
												type:   NodeType.IDENTIFIER,
												name:   't'
											}),
										]
									})
								}),
								expect.objectContaining({
									type:	NodeType.VAR_DEF,
									name:	'ans',
									init:	expect.objectContaining({})
								}),
								expect.objectContaining({
									type:   NodeType.EXPR_FUNC_CALL,
									func:   expect.objectContaining({
										type:   NodeType.IDENTIFIER,
										name:   'print'
									}),
									args:   [
										expect.objectContaining({
											type:   NodeType.IDENTIFIER,
											name:   'ans'
										}),
									]
								}),
								expect.objectContaining({
									type:	NodeType.STAT_RETURN,
									arg:	expect.objectContaining({
										type:	NodeType.LIT_NUMBER,
										value:	0
									})
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
		const err = transform(ast, standard_passes);
		expect(err).toBeUndefined();
		expect(ast).toEqual(sample.ast);
	}
})
