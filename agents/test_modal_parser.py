from modal_parser import parse_floorplan_modal

sample_html = '''
<div class="modal fade fp-modal" id="fp-modal" role="dialog">
  <div class="modal-content">
    <div class="modal-header"><h2 class="h3">The Josephine</h2></div>
    <div class="modal-body">
      <div class="fp-details">
        <ul class="list-unstyled">
          <li>1 Bed</li>
          <li>1 Bath</li>
          <li>787 Sq. Ft.</li>
        </ul>
        <div><span class="text-dark">Call for details</span></div>
        <a href="/floorplans/the-josephine" class="btn btn-primary track-apply" data-selenium-id="floorplan-0-apply-btn">Availability</a>
        <a href="/contactus?IsDialog=1" data-selenium-id="floorplan-0-contact-btn">Contact Us</a>
      </div>
    </div>
  </div>
</div>
'''

if __name__ == '__main__':
    parsed = parse_floorplan_modal(sample_html)
    print(parsed)
    assert parsed['name'] == 'The Josephine'
    assert '787' in (parsed.get('sqft') or '')
    assert parsed.get('availability_href') == '/floorplans/the-josephine'
    assert parsed.get('contact_href') == '/contactus?IsDialog=1'
    print('modal_parser test passed')
