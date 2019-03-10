/* Node modules */
import chalk from "chalk";

export function logGreen(...args: string[]): void {
	console.log(chalk.green(args as any));
}

export function logBlue(...args: string[]): void {
	console.log(chalk.blue(args as any));
}

export function logYellow(...args: string[]): void {
	console.log(chalk.yellow(args as any));
}

export function logRed(...args: string[]): void {
	console.log(chalk.red(args as any));
}