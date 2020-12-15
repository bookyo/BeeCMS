import { Image as TiptapImage } from "tiptap-extensions";
import { TextSelection } from "tiptap";

export default class Image extends TiptapImage {
    commands({ type }) {
        return attrs => (state, dispatch) => {
            const { selection,doc,tr,schema } = state
            const position = selection.$cursor ? selection.$cursor.pos : selection.$to.pos
            const node = type.create(attrs)
            const thetype = schema.nodes['paragraph']
            const transaction = state.tr.insert(position, node).insert().insert(doc.content.size, thetype.create())
            dispatch(transaction)
        }
    }
}