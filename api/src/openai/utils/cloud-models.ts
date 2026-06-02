export function isCloudModel(model: string): boolean {
  return model.includes('-cloud') || model.endsWith(':cloud')
}
