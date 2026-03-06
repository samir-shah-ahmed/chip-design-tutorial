module top;
  reg [7:0] val;

  initial begin
    val = 8'd170;
    $display("Decimal: %0d", val);
    $display("Binary:  %b", val);
    $display("Hex:     %h", val);
    $display("Octal:   %o", val);
    $finish;
  end
endmodule
