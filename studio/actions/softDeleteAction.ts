import {DocumentActionComponent, DocumentActionProps, useDocumentOperation} from 'sanity'

export function createSoftDeleteAction(originalDeleteAction: DocumentActionComponent) {
  return (props: DocumentActionProps) => {
    if (props.type !== 'guide') return originalDeleteAction(props)

    const {patch, publish} = useDocumentOperation(props.id, props.type)
    const isHidden = props.published?.isHiddenByModeration

    return {
      label: isHidden ? 'Restore Guide' : 'Soft Delete (Hide)',
      onHandle: () => {
        patch.execute([{set: {isHiddenByModeration: !isHidden}}])
        publish.execute()
        props.onComplete()
      },
    }
  }
}
