export default interface Module {
    name: string;
    description: string;
    execute(): boolean;
    stop(): boolean;
}