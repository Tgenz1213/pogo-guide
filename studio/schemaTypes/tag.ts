import {defineField, defineType} from 'sanity'
import {isAdministrator} from './auth'

export const tag = defineType({
  name: 'tag',
  title: 'Tag',
  type: 'document',
  fieldsets: [
    {
      name: 'admin',
      title: 'Administrative',
      options: {collapsible: true, collapsed: false},
    },
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Tag Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'isUserSubmitted',
      title: 'Is User Submitted',
      type: 'boolean',
      description:
        'Indicates if this tag was created from a user submission and is pending review.',
      fieldset: 'admin',
      initialValue: false,
      readOnly: ({currentUser}) => !isAdministrator(currentUser),
    }),
  ],
})
