$(document).ready(function() {
    // Delete confirmation
    $('.delete-btn, .text-danger').on('click', function(e) {
        if ($(this).closest('form').length > 0) {
            if (!confirm('Are you sure you want to delete this?')) {
                e.preventDefault();
            }
        }
    });

    // Edit modal population
    $('.edit-bookmark-btn').on('click', function() {
        const id = $(this).data('id');
        const title = $(this).data('title');
        const url = $(this).data('url');
        const desc = $(this).data('description');
        const tags = $(this).data('tags');
        const cat = $(this).data('category');

        $('#editBookmarkForm').attr('action', '/bookmarks/edit/' + id);
        $('#edit-title').val(title);
        $('#edit-url').val(url);
        $('#edit-description').val(desc);
        $('#edit-tags').val(tags);
        $('#edit-category').val(cat || "");
    });

    // Icon picker logic
    $('.select-icon-btn').on('click', function() {
        const icon = $(this).data('icon');
        $('#category-icon-input').val(icon);
        $('#selected-icon-preview').attr('class', 'glyphicon ' + icon);
        $('#iconPickerModal').modal('hide');
    });

    // Edit Slug logic
    $('.edit-slug-btn').on('click', function() {
        const id = $(this).data('id');
        const slug = $(this).data('slug');
        $('#edit-slug-form').attr('action', '/categories/slug/' + id);
        $('#custom-slug-input').val(slug);
        $('#slug-feedback').text('').removeClass('text-danger text-success');
        $('#save-slug-btn').prop('disabled', false);
        $('#editSlugModal').modal('show');
    });

    $('#custom-slug-input').on('input', function() {
        const slug = $(this).val();
        const feedback = $('#slug-feedback');
        const saveBtn = $('#save-slug-btn');

        if (!/^[a-z0-9-]+$/i.test(slug)) {
            feedback.text('Invalid format: only letters, numbers, and hyphens.').addClass('text-danger').removeClass('text-success');
            saveBtn.prop('disabled', true);
            return;
        }

        if (slug.length < 3) {
            feedback.text('Too short (min 3 chars).').addClass('text-danger').removeClass('text-success');
            saveBtn.prop('disabled', true);
            return;
        }

        // Check uniqueness via API
        $.get('/api/check-slug/' + slug, function(data) {
            feedback.text(data.message).css('color', data.color);
            if (data.unique) {
                saveBtn.prop('disabled', false);
            } else {
                saveBtn.prop('disabled', true);
            }
        });
    });

    // Search auto-focus
    $('#search-input').focus();
});
