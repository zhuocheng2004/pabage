
import pass_chunk from './chunk'
import pass_export from './export';
import pass_final from './final';
import pass_function_call from './function_call';
import pass_function_definition from './function_definition';
import pass_import from './import';
import pass_namespace from './namespace';
import pass_operation from './operation';
import pass_primitive from './primitive';
import pass_return_statement from './return_statement';
import pass_variable_definition from './variable_definition';


/* These passes must be performed in this order */
const standard_passes = [
	pass_namespace,
	pass_function_definition,
	pass_variable_definition,
	pass_export,
	pass_import,
	pass_return_statement,
	pass_chunk, 
	pass_function_call, 
	pass_operation, 
	pass_primitive,
	pass_final,
];

export {
	pass_chunk, pass_final, 
	pass_function_call, pass_function_definition, 
	pass_export, pass_import,
	pass_namespace, pass_operation, pass_primitive, 
	pass_return_statement, pass_variable_definition,
	standard_passes
};
